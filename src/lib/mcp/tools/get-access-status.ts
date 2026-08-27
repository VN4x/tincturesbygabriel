import { defineTool } from "@lovable.dev/mcp-js";
import { resolveAccess } from "../access";

export default defineTool({
  name: "get_access_status",
  title: "Get my access status",
  description:
    "Report whether the signed-in reader has full access to the book, and which roles or purchases grant it.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const access = await resolveAccess(ctx);
    const summary = access.hasBook
      ? "Full access to every chapter."
      : "No full access yet — only the open sample sections are readable.";
    return {
      content: [
        {
          type: "text",
          text: `${access.email ?? "signed-in reader"}: ${summary}\nRoles: ${
            access.roles.length ? access.roles.join(", ") : "none"
          }\nPaid purchase: ${access.paid ? "yes" : "no"}`,
        },
      ],
      structuredContent: {
        email: access.email,
        roles: access.roles,
        paid: access.paid,
        hasFullAccess: access.hasBook,
      },
    };
  },
});
