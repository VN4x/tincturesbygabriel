import { signOtpChallenge, verifyOtpChallenge } from "./access";
import { mockOtpAllowed, sendOtpEmail, type OtpMailDeps } from "./otp-mail";

export async function requireKnownReader(email: string): Promise<{ ok: true } | { ok: false; unknown: true }> {
  const normalized = email.toLowerCase().trim();
  const { getActiveReader } = await import("./admin-store.server");
  if (!(await getActiveReader(normalized))) return { ok: false, unknown: true };
  return { ok: true };
}

export async function issueOtpChallenge(
  email: string,
  deps: OtpMailDeps & { code?: string } = {},
): Promise<{ ok: true; code: string; token: string; mock: boolean } | { ok: false; unknown?: true; error?: string }> {
  const normalized = email.toLowerCase().trim();
  const known = await requireKnownReader(normalized);
  if (!known.ok) return { ok: false, unknown: true };

  const code = deps.code ?? String(Math.floor(100000 + Math.random() * 900000));
  const token = await signOtpChallenge(normalized, code);
  const mailed = await sendOtpEmail(normalized, code, deps);
  if (!mailed.ok) return { ok: false, error: mailed.error };
  return { ok: true, code, token, mock: mailed.mock };
}

export async function verifyOtpSubmission(input: {
  email: string;
  code: string;
  otpCookie?: string | null;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true } | { ok: false; error: "invalid_code" | "unknown_account" }> {
  const email = input.email.toLowerCase().trim();
  const match = await verifyOtpChallenge(input.otpCookie, email, input.code);
  const mock = mockOtpAllowed(input.env ?? process.env);
  if (!match && !mock) return { ok: false, error: "invalid_code" };
  if (!match && mock && !/^\d{6}$/.test(input.code)) return { ok: false, error: "invalid_code" };

  const { getActiveReader } = await import("./admin-store.server");
  if (!(await getActiveReader(email))) return { ok: false, error: "unknown_account" };
  return { ok: true };
}
