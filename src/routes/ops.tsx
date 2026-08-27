import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { adminLogin, getAdminDashboard } from "@/lib/admin.functions";
import { LangToggle } from "@/components/SiteHeader";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/ops")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ops — Metsa vägi" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  loader: () => getAdminDashboard(),
  component: OpsPage,
});

function OpsPage() {
  const data = Route.useLoaderData();
  if (data.ok) return <AdminPanel data={data} />;
  return <OpsLogin devHint={data.devHint} />;
}

function OpsLogin({ devHint }: { devHint: boolean }) {
  const { lang } = useLang();
  const [email, setEmail] = useState(devHint ? "gabriel@corpus.ee" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy =
    lang === "et"
      ? {
          title: "Haldus (kohalik)",
          p: "See leht ei ole avalik. Siin on failipõhine lugejate register (maksed, OTP, sõnumid). Pilve-ADMIN on /admin pärast Supabase sisselogimist.",
          email: "E-post",
          password: "Parool",
          enter: "Sisene",
          invalid: "Sisselogimine ebaõnnestus.",
          locked: "Liiga palju katseid. Oota 15 minutit.",
          missing: "ADMIN_EMAIL ja ADMIN_PASSWORD peavad olema seadistatud.",
          hint: "Kohalik vaikimisi: gabriel@corpus.ee / metsavagi-admin — enne avaldamist asenda .env väärtustega.",
        }
      : {
          title: "Ops (local ledger)",
          p: "This page is not public. It is the file-based reader ledger (payments, OTP, messages). Cloud ADMIN is /admin after Supabase sign-in.",
          email: "E-mail",
          password: "Password",
          enter: "Sign in",
          invalid: "Sign-in failed.",
          locked: "Too many attempts. Wait 15 minutes.",
          missing: "ADMIN_EMAIL and ADMIN_PASSWORD must be set.",
          hint: "Local default: gabriel@corpus.ee / metsavagi-admin — replace these in .env before launch.",
        };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.28em] text-primary uppercase">
              Metsa vägi
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-foreground">{copy.title}</h1>
          </div>
          <LangToggle />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.p}</p>
        {devHint && <p className="mt-4 text-sm text-primary">{copy.hint}</p>}
        <form
          className="mt-7 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            void (async () => {
              const res = await adminLogin({ data: { email, password } });
              if (!res.ok) {
                setError(res.error === "locked" ? copy.locked : res.error === "not_configured" ? copy.missing : copy.invalid);
                setBusy(false);
                return;
              }
              window.location.assign("/ops");
            })();
          }}
        >
          <label className="block">
            <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {copy.email}
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {copy.password}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase disabled:opacity-60"
          >
            {copy.enter}
          </button>
        </form>
      </div>
    </div>
  );
}
