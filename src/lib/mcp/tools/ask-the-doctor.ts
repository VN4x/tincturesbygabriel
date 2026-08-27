import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "ask_the_doctor",
  title: "Ask the doctor",
  description:
    "Send a question about plants, tinctures or the book to the author's admin panel, as the signed-in reader.",
  inputSchema: {
    body: z.string().trim().min(1).max(4000).describe("The question to send to the author."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ body }, ctx) => {
    const userId = ctx.getUserId();
    const email = ctx.getUserEmail();
    if (!ctx.isAuthenticated() || !userId || !email) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .insert({ user_id: userId, email: email.toLowerCase(), body, kind: "dm" })
      .select("id, created_at");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Message sent to the author's admin panel. He replies by e-mail." }],
      structuredContent: { message: data?.[0] ?? null },
    };
  },
});
