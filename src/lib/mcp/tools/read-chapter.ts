import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { blocksToText, resolveAccess } from "../access";

export default defineTool({
  name: "read_chapter",
  title: "Read a chapter",
  description:
    "Return the full text of one section of 'Metsa vägi ja tervis'. Requires full access (purchase, friend account or admin).",
  inputSchema: {
    section_id: z.string().trim().min(1).describe("Section id from list_chapters."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ section_id }, ctx) => {
    const access = await resolveAccess(ctx);
    if (!access.hasBook) {
      return {
        content: [
          {
            type: "text",
            text: "This reader does not have full access to the book. Buy access or ask the author for a friend account.",
          },
        ],
        isError: true,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("book_sections")
      .select("id, label, title, page, words, blocks")
      .eq("id", section_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No section with id ${section_id}.` }], isError: true };

    const text = blocksToText(data.blocks);
    return {
      content: [{ type: "text", text: `${data.label} — ${data.title} (lk ${data.page})\n\n${text}` }],
      structuredContent: { id: data.id, label: data.label, title: data.title, page: data.page, text },
    };
  },
});
