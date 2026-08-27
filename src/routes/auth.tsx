import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase-env";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (!isSupabaseConfigured()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sisene — Metsa vägi ja tervis" },
      {
        name: "description",
        content:
          "Sisene Gabriel Corpuse tinktuuriraamatusse Google'i kontoga või e-postile saadetud ühekordse koodiga.",
      },
      { property: "og:title", content: "Sisene — Metsa vägi ja tervis" },
      { property: "og:description", content: "Ligipääs raamatule: Google või ühekordne kood e-postile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: AuthPage,
});

const COPY = {
  et: {
    title: "Sisene",
    p: "Kaks teed sisse: Google'i konto või ühekordne kood e-postile. Koodi saadame ainult kontodele, mis on juba olemas — ostjad ja autori loodud sõbrakontod.",
    google: "Jätka Google'iga",
    or: "või",
    email: "E-posti aadress",
    send: "Saada kood",
    code: "Kuuekohaline kood",
    verify: "Kinnita ja sisene",
    resend: "Saada uus kood",
    sent: "Kood on saadetud. Vaata e-posti, kood kehtib 10 minutit.",
    unknown:
      "Selle aadressiga kontot ei ole. Osta ligipääs või küsi autorilt sõbrakonto kutset.",
    bad: "Kood ei sobi või on aegunud.",
    back: "Tagasi avalehele",
    signedIn: "Oled sisse logitud.",
    reader: "Ava raamat",
  },
  en: {
    title: "Sign in",
    p: "Two ways in: a Google account, or a one-time code by e-mail. Codes are only sent to accounts that already exist — buyers and author-created friend accounts.",
    google: "Continue with Google",
    or: "or",
    email: "E-mail address",
    send: "Send code",
    code: "Six-digit code",
    verify: "Confirm and enter",
    resend: "Send a new code",
    sent: "Code sent. Check your e-mail, it is valid for 10 minutes.",
    unknown: "No account with this address. Buy access, or ask the author for a friend invite.",
    bad: "That code is wrong or expired.",
    back: "Back to the home page",
    signedIn: "You are signed in.",
    reader: "Open the book",
  },
} as const;

function AuthPage() {
  const { lang } = useLang();
  const copy = COPY[lang === "et" ? "et" : "en"];
  const navigate = useNavigate();
  const { user, isAdmin } = useSession();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (err) {
      setError(/signups? not allowed|not found|user/i.test(err.message) ? copy.unknown : err.message);
      return;
    }
    setStage("code");
    setNotice(copy.sent);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (err) {
      setError(copy.bad);
      return;
    }
    void navigate({ to: "/read" });
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(String(result.error.message ?? result.error));
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/read" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-foreground">{copy.title}</h1>

        {user ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {copy.signedIn} <span className="text-foreground">{user.email}</span>
            </p>
            <Link
              to="/read"
              className="block rounded-full bg-primary px-6 py-3 text-center font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase"
            >
              {copy.reader}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="block rounded-full border border-border px-6 py-3 text-center font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-foreground uppercase"
              >
                ADMIN
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{copy.p}</p>

            <button
              type="button"
              onClick={() => void google()}
              className="mt-7 w-full rounded-full border border-primary/40 px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-foreground uppercase transition-colors hover:border-primary"
            >
              {copy.google}
            </button>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                {copy.or}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy) return;
                void (stage === "email" ? sendCode() : verify());
              }}
            >
              <label className="block">
                <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {copy.email}
                </span>
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="nimi@näide.ee"
                  className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-foreground outline-none focus:border-primary"
                />
              </label>

              {stage === "code" && (
                <label className="block">
                  <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                    {copy.code}
                  </span>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ""));
                      setError(null);
                    }}
                    placeholder="······"
                    className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-center font-[family-name:var(--font-ui)] text-lg tracking-[0.6em] text-foreground outline-none focus:border-primary"
                  />
                </label>
              )}

              {notice && !error && (
                <p className="font-[family-name:var(--font-ui)] text-[11px] leading-relaxed text-primary">{notice}</p>
              )}
              {error && (
                <p className="font-[family-name:var(--font-ui)] text-[11px] leading-relaxed text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {stage === "email" ? copy.send : copy.verify}
              </button>

              {stage === "code" && (
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  className="w-full font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
                >
                  {copy.resend}
                </button>
              )}
            </form>
          </>
        )}

        <Link
          to="/"
          className="mt-7 block text-center font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
        >
          {copy.back}
        </Link>
      </div>
    </main>
  );
}
