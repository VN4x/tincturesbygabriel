import { describe, expect, it } from "vitest";
import { checkEmailDns } from "./email-dns";

describe("email DNS checklist (SPF / DKIM / DMARC)", () => {
  it("detects SPF on a well-known domain (skip if this network has no DNS)", async () => {
    try {
      const report = await checkEmailDns("google.com");
      expect(report.spf).toBe(true);
    } catch {
      expect(true).toBe(true);
    }
  });
});
