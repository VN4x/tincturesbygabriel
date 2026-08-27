import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export type Access = {
  userId: string;
  email: string | null;
  roles: string[];
  isAdmin: boolean;
  paid: boolean;
  /** True when the reader may open the whole book. */
  hasBook: boolean;
};

/**
 * Resolves the caller's entitlement using their own token, so RLS decides what
 * counts. Never trust tool input for identity.
 */
export async function resolveAccess(ctx: ToolContext): Promise<Access> {
  const userId = ctx.getUserId();
  if (!ctx.isAuthenticated() || !userId) throw new Error("Not authenticated");

  const supabase = supabaseForUser(ctx);
  const [rolesRes, paidRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("purchases").select("id").eq("status", "paid").limit(1),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => String((r as { role: string }).role));
  const paid = (paidRes.data ?? []).length > 0;
  const isAdmin = roles.includes("admin");

  return {
    userId,
    email: ctx.getUserEmail() ?? null,
    roles,
    isAdmin,
    paid,
    hasBook: isAdmin || roles.includes("friend") || paid,
  };
}

type Block =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "part"; text: string }
  | { t: "table"; rows: string[][] };

export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return (blocks as Block[])
    .map((b) => {
      if (b.t === "table") return b.rows.map((row) => row.join(" | ")).join("\n");
      if (b.t === "h3") return `### ${b.text}`;
      if (b.t === "part") return `## ${b.text}`;
      return b.text;
    })
    .join("\n\n");
}
