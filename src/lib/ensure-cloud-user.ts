/** After payment, create a confirmed Supabase auth user so /auth OTP works (shouldCreateUser: false). */
export async function ensureCloudAuthUser(email: string): Promise<void> {
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    console.error("[purchase] supabase auth user", created.error.message);
  }
}
