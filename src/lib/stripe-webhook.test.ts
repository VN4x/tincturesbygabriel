import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleStripeWebhookRequest } from "./stripe-webhook";
import { stripeSignatureHeader } from "./stripe-signature";
import { getActiveReader, resetAdminStoreCache } from "./admin-store.server";

async function useTempLedger() {
  const dir = await mkdtemp(join(tmpdir(), "mv-wh-"));
  process.env["ADMIN_STORE_PATH"] = join(dir, "store.json");
  delete process.env["SUPABASE_URL"];
  delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
  resetAdminStoreCache();
}

function paidEvent(email: string, id = "cs_http") {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id,
        payment_status: "paid",
        amount_total: 500,
        customer_details: { email },
        customer_email: email,
        metadata: { email },
      },
    },
  });
}

describe("handleStripeWebhookRequest", () => {
  beforeEach(async () => {
    await useTempLedger();
  });
  afterEach(() => resetAdminStoreCache());

  it("creates a ledger row from a signed checkout.session.completed without cookies", async () => {
    const secret = "whsec_e2e";
    const raw = paidEvent("Webhook.User@Example.com");
    const header = await stripeSignatureHeader(raw, secret);
    const res = await handleStripeWebhookRequest(
      new Request("http://local/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": header, "content-type": "application/json" },
        body: raw,
      }),
      { STRIPE_WEBHOOK_SECRET: secret, NODE_ENV: "production" },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, email: "webhook.user@example.com" });
    expect(await getActiveReader("webhook.user@example.com")).toMatchObject({
      source: "purchase",
      status: "active",
    });
  });

  it("rejects a bad signature in production", async () => {
    const raw = paidEvent("bad@example.com");
    const res = await handleStripeWebhookRequest(
      new Request("http://local/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef", "content-type": "application/json" },
        body: raw,
      }),
      { STRIPE_WEBHOOK_SECRET: "whsec_e2e", NODE_ENV: "production" },
    );
    expect(res.status).toBe(400);
    expect(await getActiveReader("bad@example.com")).toBeNull();
  });

  it("refuses to run in production without a webhook secret", async () => {
    const res = await handleStripeWebhookRequest(
      new Request("http://local/api/stripe/webhook", { method: "POST", body: paidEvent("x@y.z") }),
      { NODE_ENV: "production" },
    );
    expect(res.status).toBe(500);
  });
});
