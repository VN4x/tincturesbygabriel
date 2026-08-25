import { deleteCookie, getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server";
import { signPayload, verifyPayload } from "./access";

export const ADMIN_COOKIE = "mv_admin";
const SESSION_TTL_SEC = 60 * 60 * 12;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 5;

type AdminSession = { email: string; k: "admin"; exp: number };

const failures = new Map<string, { count: number; reset: number }>();

function isProd(): boolean {
  return process.env["NODE_ENV"] === "production";
}

export function adminCredentials(): { email: string; password: string; fromEnv: boolean } | null {
  const email = (process.env["ADMIN_EMAIL"] || "").toLowerCase().trim();
  const password = process.env["ADMIN_PASSWORD"] || "";
  if (email && password.length >= 12) return { email, password, fromEnv: true };
  if (!isProd()) {
    return {
      email: email || "gabriel@corpus.ee",
      password: password || "metsavagi-admin",
      fromEnv: false,
    };
  }
  return null;
}

export function clientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) || "unknown";
  } catch {
    return "unknown";
  }
}

function bucket(ip: string): { count: number; reset: number } {
  const now = Date.now();
  const row = failures.get(ip);
  if (!row || row.reset < now) {
    const fresh = { count: 0, reset: now + FAIL_WINDOW_MS };
    failures.set(ip, fresh);
    return fresh;
  }
  return row;
}

export function loginBlocked(ip: string): boolean {
  return bucket(ip).count >= FAIL_MAX;
}

export function noteLoginFailure(ip: string): void {
  bucket(ip).count += 1;
}

export function clearLoginFailures(ip: string): void {
  failures.delete(ip);
}

export function inboxBlocked(ip: string, extraKey: string): boolean {
  const key = `inbox:${ip}:${extraKey}`;
  const now = Date.now();
  const row = failures.get(key);
  if (!row || row.reset < now) {
    failures.set(key, { count: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  row.count += 1;
  return row.count > 8;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function timingEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function passwordsMatch(given: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([digest(`mv:${given}`), digest(`mv:${expected}`)]);
  return timingEqual(left, right);
}

export async function emailsMatch(given: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([digest(given.toLowerCase().trim()), digest(expected)]);
  return timingEqual(left, right);
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    secure: isProd(),
    maxAge,
  };
}

export async function writeAdminSession(email: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const token = await signPayload({ email, k: "admin", exp } satisfies AdminSession);
  setCookie(ADMIN_COOKIE, token, cookieOpts(SESSION_TTL_SEC));
}

export function clearAdminSession(): void {
  deleteCookie(ADMIN_COOKIE, { path: "/" });
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const creds = adminCredentials();
  if (!creds) return null;
  const data = await verifyPayload<AdminSession>(getCookie(ADMIN_COOKIE));
  if (!data || data.k !== "admin" || !data.email || data.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (!(await emailsMatch(data.email, creds.email))) return null;
  return data;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
