import { describe, expect, it } from "vitest";
import { isSupabaseConfigured } from "./supabase-env";

describe("optional Supabase", () => {
  it("is off when cloud env vars are absent so /ops + cookie OTP still boot", () => {
    const prevUrl = process.env["SUPABASE_URL"];
    const prevKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const prevViteUrl = process.env["VITE_SUPABASE_URL"];
    const prevViteKey = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    delete process.env["SUPABASE_URL"];
    delete process.env["SUPABASE_PUBLISHABLE_KEY"];
    delete process.env["VITE_SUPABASE_URL"];
    delete process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    expect(isSupabaseConfigured()).toBe(false);
    if (prevUrl) process.env["SUPABASE_URL"] = prevUrl;
    if (prevKey) process.env["SUPABASE_PUBLISHABLE_KEY"] = prevKey;
    if (prevViteUrl) process.env["VITE_SUPABASE_URL"] = prevViteUrl;
    if (prevViteKey) process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] = prevViteKey;
  });
});
