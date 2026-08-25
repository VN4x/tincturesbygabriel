import { signEntitlement, type Entitlement } from "./access";

export type PaidFulfillment = {
  email: string;
  stripeSessionId?: string;
  amountCents?: number;
  note?: string;
};

/**
 * Canonical paid-access entry: local ledger + optional Supabase `purchases` row.
 * Both Checkout success (`session_id`) and the Stripe webhook must call this
 * so a closed tab, in-app browser, or webhook-only path still gets a reader.
 */
export async function fulfillPaidAccess(input: PaidFulfillment): Promise<{ email: string; source: "purchase" }> {
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) throw new Error("missing_email");

  const { upsertGrant } = await import("./admin-store.server");
  await upsertGrant({
    email,
    source: "purchase",
    ...(input.stripeSessionId ? { stripeSessionId: input.stripeSessionId } : {}),
  });

  await recordCloudPurchase(email, input).catch((err) => {
    console.error("[purchase] supabase record failed", err);
  });

  return { email, source: "purchase" as const };
}

export async function signPaidCookie(email: string): Promise<string> {
  return signEntitlement(email, "purchase");
}

export async function paidEntitlement(email: string): Promise<Entitlement> {
  const token = await signPaidCookie(email);
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5;
  return { email: email.toLowerCase().trim(), source: "purchase", exp };
}

async function recordCloudPurchase(email: string, input: PaidFulfillment): Promise<void> {
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: found } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).limit(1);
  const userId = found?.[0]?.id;
  if (!userId) return;
  const amount = input.amountCents ?? 500;
  await supabaseAdmin.from("purchases").insert({
    user_id: userId,
    email,
    amount_cents: amount,
    status: "paid",
    provider: "stripe",
    provider_ref: input.stripeSessionId ?? input.note ?? "checkout",
  });
}

export type CheckoutSessionLike = {
  id?: string | undefined;
  payment_status?: string | undefined;
  customer_email?: string | null | undefined;
  amount_total?: number | null | undefined;
  metadata?: { email?: string | undefined } | null | undefined;
};

export function checkoutSessionToFulfillment(session: CheckoutSessionLike): PaidFulfillment | { error: string } {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { error: "unpaid" };
  }
  const email = (session.metadata?.email || session.customer_email || "").toLowerCase().trim();
  if (!email) return { error: "missing_email" };
  const result: PaidFulfillment = { email };
  if (session.id) result.stripeSessionId = session.id;
  if (typeof session.amount_total === "number") result.amountCents = session.amount_total;
  return result;
}

/**
 * Webhook path: persist the paid reader without touching cookies
 * (Stripe's POST is not the buyer's browser).
 */
export async function applyPaidCheckoutSession(
  session: CheckoutSessionLike,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const mapped = checkoutSessionToFulfillment(session);
  if ("error" in mapped) return { ok: false, error: mapped.error };
  const paid = await fulfillPaidAccess(mapped);
  return { ok: true, email: paid.email };
}
