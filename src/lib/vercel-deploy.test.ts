import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deploy config", () => {
  it("pins TanStack Start and npm ci in vercel.json", () => {
    const json = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      framework?: string;
      installCommand?: string;
    };
    expect(json.framework).toBe("tanstack-start");
    expect(json.installCommand).toBe("npm ci");
  });

  it("selects the Nitro vercel preset when VERCEL is set", () => {
    const vite = readFileSync("vite.config.ts", "utf8");
    expect(vite).toContain('process.env["VERCEL"] ? "vercel"');
    expect(vite).toContain("nitroPreset");
  });

  it("bundles private/books EPUBs as Nitro server assets", () => {
    const vite = readFileSync("vite.config.ts", "utf8");
    expect(vite).toContain('dir: "./private/books"');
    expect(vite).toContain('pattern: "*.epub"');
    expect(vite).toContain("copyPrivateBooksIntoServerOutput");
  });
});
