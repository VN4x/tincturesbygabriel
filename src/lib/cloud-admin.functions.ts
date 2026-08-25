import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Roles are re-checked on the server for every admin call; the route guard is only UX. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

export type AdminOverview = {
  readers: number;
  friends: number;
  paidCount: number;
  revenueCents: number;
  openMessages: number;
  reads30d: number;
  readsTotal: number;
  topSections: { section_id: string; count: number }[];
  readsByDay: { day: string; count: number }[];
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [profiles, roles, purchases, msgs, reads, reads30] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("role").eq("role", "friend"),
      supabaseAdmin.from("purchases").select("amount_cents,status"),
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabaseAdmin.from("read_events").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("read_events").select("section_id,created_at").gte("created_at", since),
    ]);

    const paid = (purchases.data ?? []).filter((p) => p.status === "paid");
    const bySection = new Map<string, number>();
    const byDay = new Map<string, number>();
    for (const r of reads30.data ?? []) {
      bySection.set(r.section_id, (bySection.get(r.section_id) ?? 0) + 1);
      const day = String(r.created_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    return {
      readers: profiles.count ?? 0,
      friends: (roles.data ?? []).length,
      paidCount: paid.length,
      revenueCents: paid.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0),
      openMessages: msgs.count ?? 0,
      reads30d: (reads30.data ?? []).length,
      readsTotal: reads.count ?? 0,
      topSections: [...bySection.entries()]
        .map(([section_id, count]) => ({ section_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      readsByDay: [...byDay.entries()]
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    };
  });

export type AdminPerson = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: string[];
  paidCents: number;
  lastPaidAt: string | null;
  reads: number;
};

export const listPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPerson[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, roles, purchases, reads] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,email,display_name,created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("purchases").select("user_id,amount_cents,status,created_at"),
      supabaseAdmin.from("read_events").select("user_id"),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles.data ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as string]);
    }
    const readMap = new Map<string, number>();
    for (const r of reads.data ?? []) {
      if (r.user_id) readMap.set(r.user_id, (readMap.get(r.user_id) ?? 0) + 1);
    }

    return (profiles.data ?? []).map((p) => {
      const mine = (purchases.data ?? []).filter((x) => x.user_id === p.id && x.status === "paid");
      return {
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        created_at: p.created_at,
        roles: roleMap.get(p.id) ?? [],
        paidCents: mine.reduce((s, x) => s + (x.amount_cents ?? 0), 0),
        lastPaidAt: mine.map((x) => x.created_at).sort().at(-1) ?? null,
        reads: readMap.get(p.id) ?? 0,
      };
    });
  });

export type AdminMessage = {
  id: string;
  email: string;
  kind: string;
  body: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMessage[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("id,email,kind,body,status,admin_reply,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error("Could not load messages");
    return data ?? [];
  });

export const answerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        reply: z.string().trim().max(4000).optional(),
        status: z.enum(["new", "answered", "closed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("messages")
      .update({
        status: data.status,
        admin_reply: data.reply ?? null,
        replied_at: data.reply ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error("Could not update message");
    return { ok: true };
  });

export type AdminInvite = {
  id: string;
  email: string;
  note: string | null;
  accepted_at: string | null;
  created_at: string;
};

export const listInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminInvite[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("invites")
      .select("id,email,note,accepted_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load invites");
    return data ?? [];
  });

/** Creates a confirmed friend account so the person can sign in with a one-time code. */
export const createFriendAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("invites").upsert(
      { email: data.email, note: data.note ?? null, created_by: context.userId },
      { onConflict: "email" },
    );

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
    });

    if (created.error && !/already/i.test(created.error.message)) {
      throw new Error("Could not create the account");
    }

    let userId = created.data.user?.id;
    if (created.error) {
      const { data: list } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", data.email)
        .limit(1);
      userId = list?.[0]?.id;
    }
    if (userId) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "friend" }, { onConflict: "user_id,role" });
    }
    const { upsertGrant } = await import("./admin-store.server");
    await upsertGrant({ email: data.email, source: "invite" });
    return { ok: true };
  });

export const revokeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "friend");
    return { ok: true };
  });

/** Records a payment by hand (until the payment provider is switched on). */
export const recordPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        amountCents: z.number().int().min(0).max(1_000_000),
        note: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: found } = await supabaseAdmin.from("profiles").select("id").ilike("email", data.email).limit(1);
    const { error } = await supabaseAdmin.from("purchases").insert({
      user_id: found?.[0]?.id ?? null,
      email: data.email,
      amount_cents: data.amountCents,
      status: "paid",
      provider: "manual",
      provider_ref: data.note ?? null,
    });
    if (error) throw new Error("Could not record the payment");
    const { upsertGrant } = await import("./admin-store.server");
    await upsertGrant({ email: data.email, source: "purchase" });
    return { ok: true };
  });

/**
 * One-time bootstrap: the first signed-in person can take the admin role while
 * no admin exists yet. Once an admin exists this always refuses.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins } = await supabaseAdmin.from("user_roles").select("id").eq("role", "admin").limit(1);
    if ((admins ?? []).length > 0) return { ok: false, reason: "taken" as const };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error("Could not claim the admin role");
    return { ok: true, reason: "granted" as const };
  });
