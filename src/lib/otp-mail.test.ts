import { describe, expect, it, vi } from "vitest";
import { mockOtpAllowed, sendOtpEmail } from "./otp-mail";

describe("sendOtpEmail", () => {
  it("never sends when Resend is unset in development — mock log only", async () => {
    const fetchImpl = vi.fn();
    const result = await sendOtpEmail("paid@example.com", "123456", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      env: { NODE_ENV: "development" },
    });
    expect(result).toEqual({ ok: true, mock: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses mock delivery in production without Resend", async () => {
    const result = await sendOtpEmail("paid@example.com", "123456", {
      env: { NODE_ENV: "production" },
    });
    expect(result).toEqual({ ok: false, error: "resend_not_configured" });
  });

  it("posts to Resend and fails the send if the API errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    const result = await sendOtpEmail("paid@example.com", "123456", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      env: { RESEND_API_KEY: "re_test", OTP_FROM: "Metsa vägi <raamat@example.com>" },
    });
    expect(result).toEqual({ ok: false, error: "resend_failed" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const payload = JSON.stringify(fetchImpl.mock.calls);
    expect(payload).toContain("https://api.resend.com/emails");
    expect(payload).toContain("paid@example.com");
    expect(payload).toContain("123456");
  });

  it("treats a 200 from Resend as a real send", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const result = await sendOtpEmail("paid@example.com", "111111", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      env: { RESEND_API_KEY: "re_test" },
    });
    expect(result).toEqual({ ok: true, mock: false });
  });
});

describe("mockOtpAllowed", () => {
  it("is off whenever a Resend key is present", () => {
    expect(mockOtpAllowed({ RESEND_API_KEY: "re_x", NODE_ENV: "development" })).toBe(false);
  });
  it("is off in production even without a key", () => {
    expect(mockOtpAllowed({ NODE_ENV: "production" })).toBe(false);
  });
});
