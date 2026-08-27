import { defineTool } from "@lovable.dev/mcp-js";
import { resolveAccess } from "../access";

export default defineTool({
  name: "list_chapters",
  title: "List book chapters",
  description:
    "List the table of contents of 'Metsa vägi ja tervis' (id, label, title, page, word count) for the signed-in reader.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const access = await resolveAccess(ctx);
    // The book text lives in a private table with no client grants; read the
    // metadata server-side only after the caller's identity is verified.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("book_sections")
      .select("id, kind, label, title, page, words")
      .order("ord", { ascending: true });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    const lines = rows.map((r) => `${r.label} — ${r.title} (id: ${r.id}, lk ${r.page}, ${r.words} sõna)`);
    return {
      content: [
        {
          type: "text",
          text: `${rows.length} sections.\nFull access: ${access.hasBook ? "yes" : "no"}\n\n${lines.join("\n")}`,
        },
      ],
      structuredContent: { hasFullAccess: access.hasBook, sections: rows },
    };
  },
});
