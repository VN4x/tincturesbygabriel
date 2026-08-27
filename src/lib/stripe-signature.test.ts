import { describe, expect, it } from "vitest";
import { stripeSignatureHeader, verifyStripeSignature } from "./stripe-signature";

describe("Stripe webhook signatures", () => {
  it("accepts a fresh HMAC v1 header", async () => {
    const secret = "whsec_test";
    const raw = JSON.stringify({ type: "checkout.session.completed" });
    const header = await stripeSignatureHeader(raw, secret);
    expect(await verifyStripeSignature(raw, header, secret)).toBe(true);
  });

  it("rejects a tampered body or stale timestamp", async () => {
    const secret = "whsec_test";
    const raw = '{"type":"checkout.session.completed"}';
    const header = await stripeSignatureHeader(raw, secret);
    expect(await verifyStripeSignature(raw + "x", header, secret)).toBe(false);

    const old = await stripeSignatureHeader(raw, secret, Math.floor(Date.now() / 1000) - 600);
    expect(await verifyStripeSignature(raw, old, secret)).toBe(false);
  });
});
