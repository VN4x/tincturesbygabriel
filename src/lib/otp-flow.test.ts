import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPaidCheckoutSession } from "./purchase-fulfillment";
import { issueOtpChallenge, requireKnownReader, verifyOtpSubmission } from "./otp-flow";
import { getActiveReader, resetAdminStoreCache } from "./admin-store.server";
import { signOtpChallenge } from "./access";

async function useTempLedger() {
  const dir = await mkdtemp(join(tmpdir(), "mv-otp-"));
  process.env["ADMIN_STORE_PATH"] = join(dir, "store.json");
  delete process.env["SUPABASE_URL"];
  delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
  delete process.env["RESEND_API_KEY"];
  process.env["NODE_ENV"] = "test";
  resetAdminStoreCache();
}

describe("paid user on a new device (webhook then OTP, no success tab)", () => {
  beforeEach(useTempLedger);
  afterEach(() => resetAdminStoreCache());

  it("refuses OTP to strangers so Resend is never a spam vector", async () => {
    expect(await requireKnownReader("stranger@example.com")).toEqual({ ok: false, unknown: true });
    const issued = await issueOtpChallenge("stranger@example.com", {
      fetchImpl: (async () => {
        throw new Error("must not send");
      }) as unknown as typeof fetch,
    });
    expect(issued).toMatchObject({ ok: false, unknown: true });
  });

  it("after webhook-only payment, OTP verify mints access on a cookie-less client", async () => {
    const paid = await applyPaidCheckoutSession({
      id: "cs_closed_tab",
      payment_status: "paid",
      customer_details: { email: "Safari.Pay@Example.com" },
      amount_total: 500,
    });
    expect(paid).toEqual({ ok: true, email: "safari.pay@example.com" });
    expect(await requireKnownReader("Safari.Pay@Example.com")).toEqual({ ok: true });

    const issued = await issueOtpChallenge("safari.pay@example.com", { code: "424242" });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const verified = await verifyOtpSubmission({
      email: "safari.pay@example.com",
      code: "424242",
      otpCookie: issued.token,
      env: { NODE_ENV: "test" },
    });
    expect(verified).toEqual({ ok: true });
    expect(await getActiveReader("safari.pay@example.com")).toMatchObject({
      source: "purchase",
      status: "active",
    });
  });

  it("rejects an expired OTP even when the cookie is still attached", async () => {
    await applyPaidCheckoutSession({
      id: "cs_exp",
      payment_status: "paid",
      customer_email: "exp@example.com",
    });
    const realNow = Date.now;
    Date.now = () => 1_700_000_000_000;
    const token = await signOtpChallenge("exp@example.com", "111111");
    Date.now = () => 1_700_000_000_000 + 11 * 60 * 1000;
    const verified = await verifyOtpSubmission({
      email: "exp@example.com",
      code: "111111",
      otpCookie: token,
      env: { RESEND_API_KEY: "re_force_real", NODE_ENV: "test" },
    });
    Date.now = realNow;
    expect(verified).toEqual({ ok: false, error: "invalid_code" });
  });
});
