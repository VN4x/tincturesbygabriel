import { applyPaidCheckoutSession, type CheckoutSessionLike } from "./purchase-fulfillment";
import { verifyStripeSignature } from "./stripe-signature";

export type StripeWebhookEnv = {
  STRIPE_WEBHOOK_SECRET?: string | undefined;
  NODE_ENV?: string | undefined;
};

export async function handleStripeWebhookRequest(
  request: Request,
  env: StripeWebhookEnv = process.env,
): Promise<Response> {
  const raw = await request.text();
  const secret = env["STRIPE_WEBHOOK_SECRET"];
  if (secret) {
    const ok = await verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret);
    if (!ok) return new Response("invalid signature", { status: 400 });
  } else if (env["NODE_ENV"] === "production") {
    return new Response("webhook secret missing", { status: 500 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const obj = (event.data?.object ?? {}) as CheckoutSessionLike;
    const result = await applyPaidCheckoutSession(obj);
    if (!result.ok) {
      return Response.json({ received: true, skipped: result.error });
    }
    return Response.json({ received: true, email: result.email });
  }

  return Response.json({ received: true });
}
