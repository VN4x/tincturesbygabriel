import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_messages",
  title: "List my messages",
  description: "List the signed-in reader's own questions to the author and any replies.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Maximum messages to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .select("id, created_at, body, status, admin_reply, replied_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    if (rows.length === 0) return { content: [{ type: "text", text: "No messages yet." }] };
    return {
      content: [
        {
          type: "text",
          text: rows
            .map(
              (m) =>
                `${new Date(m.created_at).toISOString().slice(0, 10)} [${m.status}] ${m.body}${
                  m.admin_reply ? `\n  → reply: ${m.admin_reply}` : ""
                }`,
            )
            .join("\n\n"),
        },
      ],
      structuredContent: { messages: rows },
    };
  },
});
