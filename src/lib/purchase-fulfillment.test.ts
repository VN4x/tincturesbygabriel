import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyPaidCheckoutSession,
  checkoutSessionToFulfillment,
  fulfillPaidAccess,
} from "./purchase-fulfillment";
import { getActiveReader, resetAdminStoreCache } from "./admin-store.server";

async function useTempLedger() {
  const dir = await mkdtemp(join(tmpdir(), "mv-ledger-"));
  process.env["ADMIN_STORE_PATH"] = join(dir, "store.json");
  delete process.env["SUPABASE_URL"];
  delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
  resetAdminStoreCache();
  return process.env["ADMIN_STORE_PATH"];
}

describe("checkoutSessionToFulfillment", () => {
  it("rejects unpaid sessions so no reader is created from a bounce", () => {
    expect(
      checkoutSessionToFulfillment({
        id: "cs_unpaid",
        payment_status: "unpaid",
        customer_email: "buyer@example.com",
      }),
    ).toEqual({ error: "unpaid" });
  });

  it("rejects paid sessions with no email (Stripe Checkout must collect it)", () => {
    expect(
      checkoutSessionToFulfillment({
        id: "cs_no_email",
        payment_status: "paid",
      }),
    ).toEqual({ error: "missing_email" });
  });

  it("prefers Stripe-collected customer_details.email over metadata", () => {
    expect(
      checkoutSessionToFulfillment({
        id: "cs_meta",
        payment_status: "paid",
        customer_email: "Other@Example.com",
        amount_total: 500,
        metadata: { email: "Buyer@Example.com" },
        customer_details: { email: "Paid.User@Example.com" },
      }),
    ).toEqual({
      email: "paid.user@example.com",
      stripeSessionId: "cs_meta",
      amountCents: 500,
    });
  });

  it("falls back to customer_email then metadata when Checkout did not fill customer_details", () => {
    expect(
      checkoutSessionToFulfillment({
        id: "cs_cust",
        payment_status: "paid",
        customer_email: "Cust@Example.com",
        metadata: { email: "Meta@Example.com" },
      }),
    ).toEqual({
      email: "cust@example.com",
      stripeSessionId: "cs_cust",
    });
  });

  it("accepts no_payment_required (100% off / zero-decimal edge)", () => {
    const mapped = checkoutSessionToFulfillment({
      payment_status: "no_payment_required",
      customer_email: "gift@example.com",
    });
    expect(mapped).toMatchObject({ email: "gift@example.com" });
  });
});

describe("paid entry after payment (webhook and success URL)", () => {
  beforeEach(async () => {
    await useTempLedger();
  });

  afterEach(() => {
    resetAdminStoreCache();
  });

  it("does not write a ledger row for unpaid or email-less sessions", async () => {
    const unpaid = await applyPaidCheckoutSession({
      id: "cs_skip",
      payment_status: "unpaid",
      customer_email: "skip@example.com",
    });
    expect(unpaid).toEqual({ ok: false, error: "unpaid" });
    expect(await getActiveReader("skip@example.com")).toBeNull();

    const noEmail = await applyPaidCheckoutSession({ id: "cs_skip2", payment_status: "paid" });
    expect(noEmail).toEqual({ ok: false, error: "missing_email" });
  });

  it("webhook-only path still creates an OTP-able purchase row (closed tab / in-app browser)", async () => {
    const webhook = await applyPaidCheckoutSession({
      id: "cs_webhook_only",
      payment_status: "paid",
      customer_email: "Safari.User@Example.com",
      amount_total: 500,
    });
    expect(webhook).toEqual({ ok: true, email: "safari.user@example.com" });

    const reader = await getActiveReader("Safari.User@Example.com");
    expect(reader).toMatchObject({
      email: "safari.user@example.com",
      source: "purchase",
      status: "active",
      stripeSessionId: "cs_webhook_only",
    });
  });

  it("success-URL replay after webhook is idempotent — still one active purchase", async () => {
    const session = {
      id: "cs_both_paths",
      payment_status: "paid" as const,
      customer_email: "both@example.com",
      amount_total: 500,
    };

    expect(await applyPaidCheckoutSession(session)).toEqual({ ok: true, email: "both@example.com" });
    await fulfillPaidAccess({
      email: "both@example.com",
      stripeSessionId: "cs_both_paths",
      note: "success-url",
    });

    const reader = await getActiveReader("both@example.com");
    expect(reader?.source).toBe("purchase");
    expect(reader?.status).toBe("active");
    expect(reader?.stripeSessionId).toBe("cs_both_paths");
  });

  it("persists the grant to ADMIN_STORE_PATH so another Node process can OTP the buyer", async () => {
    const path = process.env["ADMIN_STORE_PATH"];
    expect(path).toBeTruthy();
    await applyPaidCheckoutSession({
      id: "cs_disk",
      payment_status: "paid",
      metadata: { email: "disk@example.com" },
    });
    resetAdminStoreCache();
    const raw = await readFile(path as string, "utf8");
    const store = JSON.parse(raw) as { readers: Record<string, { source: string }> };
    expect(store.readers["disk@example.com"]?.source).toBe("purchase");
    expect(await getActiveReader("disk@example.com")).not.toBeNull();
  });
});
