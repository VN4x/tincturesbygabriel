import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ops scripts", () => {
  it("refresh-lovable-snapshot fetches origin/main and refuses a pull into the working tree", () => {
    const sh = readFileSync("scripts/refresh-lovable-snapshot.sh", "utf8");
    expect(sh).toContain("git fetch origin main");
    expect(sh).toContain("worktree add --detach lovable origin/main");
    expect(sh).toContain("refusing: do not git pull/merge");
    expect(sh.includes("\ngit pull origin")).toBe(false);
  });

  it("check-secrets fails on a tracked .env", () => {
    const sh = readFileSync("scripts/check-secrets.sh", "utf8");
    expect(sh).toContain(".env");
    expect(sh).toContain("sk_live_");
    expect(sh).toContain(":!scripts/check-secrets.sh");
  });
});
