import { mockOtpAllowed } from "./otp-mail";

const COOKIE = "mv_access";
const OTP_COOKIE = "mv_otp";
const BOOK_TOKEN_TTL_SEC = 90;

export type AccessSource = "otp" | "invite" | "purchase" | "admin";

export type Entitlement = {
  email: string;
  source: AccessSource;
  exp: number;
};

function env(name: string): string | undefined {
  return process.env[name];
}

function secret(): string {
  return env("ACCESS_SECRET") || "dev-only-change-me";
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlJson(value: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

export async function signPayload(payload: object): Promise<string> {
  const body = b64urlJson(payload);
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyPayload<T>(token: string | undefined | null): Promise<T | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected.length !== sig.length) return null;
  let ok = 0;
  for (let i = 0; i < expected.length; i += 1) ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(body))) as T;
  } catch {
    return null;
  }
}

export async function signEntitlement(email: string, source: AccessSource): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5;
  return signPayload({ email: email.toLowerCase().trim(), source, exp });
}

export async function readEntitlement(token: string | undefined | null): Promise<Entitlement | null> {
  const data = await verifyPayload<Entitlement>(token);
  if (!data?.email || !data.exp) return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export async function signOtpChallenge(email: string, code: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  return signPayload({ email: email.toLowerCase().trim(), code, exp });
}

export async function verifyOtpChallenge(
  token: string | undefined | null,
  email: string,
  code: string,
): Promise<boolean> {
  const data = await verifyPayload<{ email: string; code: string; exp: number }>(token);
  if (!data) return false;
  if (data.exp < Math.floor(Date.now() / 1000)) return false;
  return data.email === email.toLowerCase().trim() && data.code === code;
}

export async function signBookToken(email: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + BOOK_TOKEN_TTL_SEC;
  return signPayload({ email, exp, k: "book" });
}

export async function readBookToken(token: string | undefined | null): Promise<string | null> {
  const data = await verifyPayload<{ email: string; exp: number; k?: string }>(token);
  if (!data?.email || data.k !== "book") return null;
  return data.email;
}

export async function verifyBookToken(token: string | undefined | null): Promise<boolean> {
  return Boolean(await readBookToken(token));
}

export function cookieNames() {
  return { COOKIE, OTP_COOKIE };
}

export function inviteTokens(): string[] {
  const raw = env("INVITE_TOKENS") || "METSAVAGI-FRIEND";
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function mockOtpEnabled(): boolean {
  return mockOtpAllowed(process.env);
}

export function stripeConfigured(): boolean {
  return Boolean(env("STRIPE_SECRET_KEY") && env("STRIPE_PRICE_ID"));
}
