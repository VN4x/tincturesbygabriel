import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { blocksToText, resolveAccess } from "../access";

export default defineTool({
  name: "search_book",
  title: "Search the book",
  description:
    "Search 'Metsa vägi ja tervis' for a word or phrase and return matching passages with their section. Requires full access.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Word or phrase to look for, e.g. 'naistepuna'."),
    limit: z.number().int().min(1).max(20).optional().describe("Maximum passages to return (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const access = await resolveAccess(ctx);
    if (!access.hasBook) {
      return {
        content: [{ type: "text", text: "This reader does not have full access to the book." }],
        isError: true,
      };
    }

    const max = limit ?? 5;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("book_sections")
      .select("id, label, title, page, blocks")
      .order("ord", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const needle = query.toLowerCase();
    const hits: { id: string; label: string; title: string; page: number; excerpt: string }[] = [];
    for (const row of data ?? []) {
      const text = blocksToText(row.blocks);
      let from = 0;
      while (hits.length < max) {
        const at = text.toLowerCase().indexOf(needle, from);
        if (at === -1) break;
        hits.push({
          id: row.id,
          label: row.label,
          title: row.title,
          page: row.page,
          excerpt: text.slice(Math.max(0, at - 220), at + 220).replace(/\s+/g, " ").trim(),
        });
        from = at + needle.length;
      }
      if (hits.length >= max) break;
    }

    if (hits.length === 0) {
      return { content: [{ type: "text", text: `No passage matches "${query}".` }] };
    }
    return {
      content: [
        {
          type: "text",
          text: hits.map((h) => `${h.label} — ${h.title} (lk ${h.page}, id: ${h.id})\n…${h.excerpt}…`).join("\n\n"),
        },
      ],
      structuredContent: { query, hits },
    };
  },
});
