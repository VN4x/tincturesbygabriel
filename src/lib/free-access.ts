export function freeAccessEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = env["FREE_ACCESS"];
  return v === "1" || v === "true" || v === "yes";
}

export function freeAccessEmail(env: Record<string, string | undefined> = process.env): string {
  return (env["FREE_ACCESS_EMAIL"] || "preview@metsavagi.test").toLowerCase().trim();
}

/** Client UI: set VITE_FREE_ACCESS=1 on Vercel alongside FREE_ACCESS. */
export function freeAccessUiEnabled(): boolean {
  try {
    const v = import.meta.env["VITE_FREE_ACCESS"];
    if (v === undefined || v === null || v === "") return false;
    const s = String(v);
    return s === "1" || s === "true" || s === "yes";
  } catch {
    return false;
  }
}
