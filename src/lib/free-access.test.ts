import { describe, expect, it } from "vitest";
import { freeAccessEmail, freeAccessEnabled } from "./free-access";

describe("freeAccessEnabled", () => {
  it("is off by default", () => {
    expect(freeAccessEnabled({})).toBe(false);
    expect(freeAccessEnabled({ FREE_ACCESS: "0" })).toBe(false);
  });

  it("accepts 1, true, and yes", () => {
    expect(freeAccessEnabled({ FREE_ACCESS: "1" })).toBe(true);
    expect(freeAccessEnabled({ FREE_ACCESS: "true" })).toBe(true);
    expect(freeAccessEnabled({ FREE_ACCESS: "yes" })).toBe(true);
  });
});

describe("freeAccessEmail", () => {
  it("defaults to a stable preview address", () => {
    expect(freeAccessEmail({})).toBe("preview@metsavagi.test");
  });

  it("honours FREE_ACCESS_EMAIL", () => {
    expect(freeAccessEmail({ FREE_ACCESS_EMAIL: "Design@Example.com" })).toBe("design@example.com");
  });
});
