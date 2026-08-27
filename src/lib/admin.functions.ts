import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { cookieNames, readEntitlement } from "./access";
import {
  adminCredentials,
  clearAdminSession,
  clearLoginFailures,
  clientIp,
  emailsMatch,
  inboxBlocked,
  loginBlocked,
  noteLoginFailure,
  passwordsMatch,
  readAdminSession,
  sleep,
  writeAdminSession,
} from "./admin-auth";

async function store() {
  return import("./admin-store.server");
}

async function requireAdmin() {
  const session = await readAdminSession();
  if (!session) return null;
  return session;
}

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAdmin();
  const creds = adminCredentials();
  const devHint = Boolean(creds && !creds.fromEnv);
  if (!session) return { ok: false as const, devHint };
  const { buildDashboard } = await store();
  const dashboard = await buildDashboard();
  return { ok: true as const, email: session.email, devHint, ...dashboard };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const ip = clientIp();
    await sleep(350);
    if (loginBlocked(ip)) {
      return { ok: false as const, error: "locked" as const };
    }
    const creds = adminCredentials();
    if (!creds) {
      noteLoginFailure(ip);
      return { ok: false as const, error: "not_configured" as const };
    }
    const emailOk = await emailsMatch(data.email, creds.email);
    const passOk = await passwordsMatch(data.password, creds.password);
    if (!emailOk || !passOk) {
      noteLoginFailure(ip);
      return { ok: false as const, error: "invalid" as const };
    }
    if (!creds.fromEnv) {
      console.warn("[admin] using development credentials — set ADMIN_EMAIL and ADMIN_PASSWORD before production");
    }
    clearLoginFailures(ip);
    await writeAdminSession(creds.email);
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  clearAdminSession();
  return { ok: true as const };
});

export const adminGrant = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), note: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    if (!(await requireAdmin())) return { ok: false as const, error: "unauthorized" as const };
    const { grantFromAdmin } = await store();
    const reader = await grantFromAdmin(data.email, data.note || "");
    return { ok: true as const, reader };
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      status: z.enum(["active", "revoked"]),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await requireAdmin())) return { ok: false as const, error: "unauthorized" as const };
    const { restoreReader, revokeReader } = await store();
    const ok = data.status === "revoked" ? await revokeReader(data.email) : await restoreReader(data.email);
    return { ok };
  });

export const adminSetNote = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), note: z.string().max(500) }))
  .handler(async ({ data }) => {
    if (!(await requireAdmin())) return { ok: false as const, error: "unauthorized" as const };
    const { updateReaderNote } = await store();
    return { ok: await updateReaderNote(data.email, data.note) };
  });

export const adminHandleInbox = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "open", "replied", "closed"]),
      reply: z.string().max(4000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await requireAdmin())) return { ok: false as const, error: "unauthorized" as const };
    const { updateInbox } = await store();
    const item = await updateInbox({
      id: data.id,
      status: data.status,
      ...(data.reply !== undefined ? { reply: data.reply } : {}),
    });
    if (!item) return { ok: false as const, error: "missing" as const };
    if (data.reply?.trim() && item.email) {
      await sendAdminMail(
        item.email,
        item.kind === "issue" ? "Metsa vägi — vastus probleemile" : "Metsa vägi — vastus doktorilt",
        data.reply.trim(),
      );
    }
    return { ok: true as const, item };
  });

export const submitInbox = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kind: z.enum(["dm", "issue"]),
      email: z.string().email(),
      body: z.string().min(8).max(4000),
    }),
  )
  .handler(async ({ data }) => {
    const ip = clientIp();
    if (inboxBlocked(ip, data.email.toLowerCase())) {
      return { ok: false as const, error: "rate" as const };
    }
    const { addInbox } = await store();
    await addInbox(data);
    return { ok: true as const };
  });

export const reportProgress = createServerFn({ method: "POST" })
  .validator(
    z.object({
      progress: z.number().min(0).max(1),
      chapter: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ent = await readEntitlement(getCookie(cookieNames().COOKIE));
    if (!ent) return { ok: false as const };
    const { getActiveReader, recordProgress } = await store();
    if (!(await getActiveReader(ent.email))) return { ok: false as const };
    await recordProgress(ent.email, data.progress, data.chapter);
    return { ok: true as const };
  });

async function sendAdminMail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return;
  const from = process.env["OTP_FROM"] || "Metsa vägi <noreply@localhost>";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
  } catch (err) {
    console.error("[admin] reply mail failed", err);
  }
}
