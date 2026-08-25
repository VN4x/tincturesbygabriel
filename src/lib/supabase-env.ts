export function isSupabaseConfigured(): boolean {
  const url =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env["VITE_SUPABASE_URL"]) ||
    process.env["VITE_SUPABASE_URL"] ||
    process.env["SUPABASE_URL"];
  const key =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"];
  return Boolean(url && key);
}
