export type OtpMailResult =
  | { ok: true; mock: false }
  | { ok: true; mock: true }
  | { ok: false; error: string };

export type OtpMailDeps = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
};

function envOf(deps: OtpMailDeps, name: string): string | undefined {
  if (deps.env && Object.prototype.hasOwnProperty.call(deps.env, name)) return deps.env[name];
  return process.env[name];
}

export function mockOtpAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env["RESEND_API_KEY"]) return false;
  return env["NODE_ENV"] !== "production";
}

export async function sendOtpEmail(email: string, code: string, deps: OtpMailDeps = {}): Promise<OtpMailResult> {
  const key = envOf(deps, "RESEND_API_KEY");
  if (!key) {
    if (envOf(deps, "NODE_ENV") === "production") {
      return { ok: false, error: "resend_not_configured" };
    }
    if (envOf(deps, "NODE_ENV") !== "production") {
      console.info(`[otp] ${email} → ${code}`);
    }
    return { ok: true, mock: true };
  }

  const from = envOf(deps, "OTP_FROM") || "Metsa vägi <noreply@localhost>";
  const fetchImpl = deps.fetchImpl ?? fetch;
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Metsa vägi — sisselogimiskood",
      text: `Sinu ühekordne kood: ${code}\nKehtib 10 minutit.`,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[otp] resend failed", res.status, text);
    return { ok: false, error: "resend_failed" };
  }
  return { ok: true, mock: false };
}
