import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  cookieNames,
  inviteTokens,
  readEntitlement,
  signBookToken,
  signEntitlement,
  stripeConfigured,
  type AccessSource,
  type Entitlement,
} from "./access";
import { freeAccessEmail, freeAccessEnabled } from "./free-access";

const { COOKIE, OTP_COOKIE } = cookieNames();

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env["NODE_ENV"] === "production",
    maxAge,
  };
}

async function grant(email: string, source: AccessSource, stripeSessionId?: string): Promise<Entitlement> {
  if (source === "purchase") {
    const { fulfillPaidAccess } = await import("./purchase-fulfillment");
    await fulfillPaidAccess({
      email,
      ...(stripeSessionId ? { stripeSessionId, note: `stripe:${stripeSessionId}` } : { note: "mock-or-direct" }),
    });
    const token = await signEntitlement(email, "purchase");
    setCookie(COOKIE, token, cookieOpts(60 * 60 * 24 * 365 * 5));
    deleteCookie(OTP_COOKIE);
    const ent = await readEntitlement(token);
    if (!ent) throw new Error("failed to persist entitlement");
    return ent;
  }

  const { getActiveReader, upsertGrant } = await import("./admin-store.server");
  if (source === "otp") {
    const existing = await getActiveReader(email);
    if (!existing) throw new Error("unknown_account");
  }
  const reader = await upsertGrant({
    email,
    source,
    ...(stripeSessionId ? { stripeSessionId } : {}),
  });
  const token = await signEntitlement(email, reader.source);
  setCookie(COOKIE, token, cookieOpts(60 * 60 * 24 * 365 * 5));
  deleteCookie(OTP_COOKIE);
  const ent = await readEntitlement(token);
  if (!ent) throw new Error("failed to persist entitlement");
  return ent;
}

async function cookieFromActiveReader(email: string): Promise<Entitlement | null> {
  const { getActiveReader } = await import("./admin-store.server");
  const reader = await getActiveReader(email);
  if (!reader) return null;
  const token = await signEntitlement(email, reader.source);
  setCookie(COOKIE, token, cookieOpts(60 * 60 * 24 * 365 * 5));
  return readEntitlement(token);
}

async function emailFromCloudAuthHeader(): Promise<string | null> {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const header = getRequest().headers.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const jwt = header.slice("Bearer ".length);
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);
    const { data } = await supabase.auth.getUser(jwt);
    const email = data.user?.email?.toLowerCase().trim();
    return email && email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

async function ensureFreeAccessEntitlement(): Promise<Entitlement> {
  const email = freeAccessEmail();
  const existing = await readEntitlement(getCookie(COOKIE));
  if (existing?.email === email) return existing;
  return grant(email, "admin");
}

/** Google / cloud OTP session on a new device: mint the reader cookie from ledger or paid/friend role. */
async function bridgeCloudEntitlement(): Promise<Entitlement | null> {
  const email = await emailFromCloudAuthHeader();
  if (!email) return null;
  const fromLedger = await cookieFromActiveReader(email);
  if (fromLedger) return fromLedger;
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: paid } = await supabaseAdmin.from("purchases").select("id").eq("email", email).eq("status", "paid").limit(1);
    if (paid?.length) return grant(email, "purchase");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).limit(1);
    const userId = profile?.[0]?.id;
    if (!userId) return null;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    const list = (roles ?? []).map((r) => r.role);
    if (list.includes("admin")) return grant(email, "admin");
    if (list.includes("friend")) return grant(email, "invite");
  } catch (err) {
    console.error("[access] cloud entitlement bridge failed", err);
  }
  return null;
}

export const getEntitlement = createServerFn({ method: "GET" }).handler(async (): Promise<Entitlement | null> => {
  if (freeAccessEnabled()) return ensureFreeAccessEntitlement();
  const ent = await readEntitlement(getCookie(COOKIE));
  if (!ent) return bridgeCloudEntitlement();
  const { getActiveReader, upsertGrant } = await import("./admin-store.server");
  const reader = await getActiveReader(ent.email);
  if (reader) return { ...ent, source: reader.source };
  if (ent.source === "purchase" || ent.source === "invite" || ent.source === "admin") {
    const created = await upsertGrant({ email: ent.email, source: ent.source });
    return { ...ent, source: created.source };
  }
  deleteCookie(COOKIE);
  return bridgeCloudEntitlement();
});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE);
  deleteCookie(OTP_COOKIE);
  return { ok: true as const };
});

export const requestOtp = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const { issueOtpChallenge } = await import("./otp-flow");
    const issued = await issueOtpChallenge(email);
    if (!issued.ok && issued.unknown) {
      return { sent: false as const, unknown: true as const };
    }
    if (!issued.ok) {
      return { sent: false as const, unknown: false as const, error: issued.error };
    }
    setCookie(OTP_COOKIE, issued.token, cookieOpts(10 * 60));
    return { sent: true as const, mock: issued.mock, unknown: false as const };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const { verifyOtpSubmission } = await import("./otp-flow");
    const otpCookie = getCookie(OTP_COOKIE);
    const checked = await verifyOtpSubmission({
      email,
      code: data.code,
      ...(otpCookie ? { otpCookie } : {}),
    });
    if (!checked.ok) return { ok: false as const, error: checked.error };
    try {
      const ent = await grant(email, "otp");
      return { ok: true as const, entitlement: ent };
    } catch {
      return { ok: false as const, error: "unknown_account" };
    }
  });

export const redeemInvite = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(4), email: z.string().email().optional() }))
  .handler(async ({ data }) => {
    const code = data.token.trim().toUpperCase();
    if (!inviteTokens().includes(code)) {
      return { ok: false as const, error: "invalid_invite" };
    }
    const email = (data.email || `friend+${code.toLowerCase()}@local`).toLowerCase();
    const ent = await grant(email, "invite");
    return { ok: true as const, entitlement: ent };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    if (!stripeConfigured()) {
      const ent = await grant(email, "purchase");
      return { ok: true as const, mock: true as const, entitlement: ent };
    }

    const origin = process.env["PUBLIC_SITE_URL"] || "http://localhost:3000";
    const priceId = process.env["STRIPE_PRICE_ID"];
    if (!priceId) return { ok: false as const, error: "stripe_failed" };
    const { stripeCheckoutForm } = await import("./checkout-body");
    const body = stripeCheckoutForm({ origin, email, priceId });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["STRIPE_SECRET_KEY"]}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("stripe checkout failed", text);
      return { ok: false as const, error: "stripe_failed" };
    }
    const session = (await res.json()) as { url?: string };
    if (!session.url) return { ok: false as const, error: "stripe_failed" };
    return { ok: true as const, mock: false as const, url: session.url };
  });

export const completeStripeSession = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().min(4) }))
  .handler(async ({ data }) => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) return { ok: false as const, error: "stripe_not_configured" };
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false as const, error: "stripe_failed" };
    const session = (await res.json()) as {
      payment_status?: string;
      customer_email?: string;
      amount_total?: number;
      metadata?: { email?: string };
      customer_details?: { email?: string };
    };
    const { checkoutSessionToFulfillment } = await import("./purchase-fulfillment");
    const mapped = checkoutSessionToFulfillment({
      id: data.sessionId,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      metadata: session.metadata,
      customer_details: session.customer_details,
    });
    if ("error" in mapped) {
      return { ok: false as const, error: mapped.error };
    }
    const ent = await grant(mapped.email, "purchase", mapped.stripeSessionId);
    return { ok: true as const, entitlement: ent };
  });

export const issueBookUrl = createServerFn({ method: "GET" }).handler(async () => {
  if (freeAccessEnabled()) {
    const email = freeAccessEmail();
    const { recordRead } = await import("./admin-store.server");
    await recordRead(email).catch(() => undefined);
    const token = await signBookToken(email);
    return { ok: true as const, url: `/api/book?t=${encodeURIComponent(token)}` };
  }
  const ent = await readEntitlement(getCookie(COOKIE));
  if (!ent) return { ok: false as const, error: "unauthorized" };
  const { getActiveReader, recordRead } = await import("./admin-store.server");
  if (!(await getActiveReader(ent.email))) return { ok: false as const, error: "unauthorized" };
  await recordRead(ent.email);
  const token = await signBookToken(ent.email);
  return { ok: true as const, url: `/api/book?t=${encodeURIComponent(token)}` };
});
