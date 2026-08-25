import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAccess, type AccessMode } from "@/lib/access-context";
import { useLang } from "@/lib/i18n";
import { redeemInvite, requestOtp, startCheckout, verifyOtp } from "@/lib/access.functions";

export function AccessDialog() {
  const { open, closeAccess, mode, refresh } = useAccess();
  if (!open) return null;
  return <AccessDialogInner mode={mode} onClose={closeAccess} onGranted={refresh} />;
}

function AccessDialogInner({
  mode,
  onClose,
  onGranted,
}: {
  mode: AccessMode;
  onClose: () => void;
  onGranted: () => Promise<void>;
}) {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const copy =
    lang === "et"
      ? {
          loginTitle: "Sisene ühekordse koodiga",
          loginP: "Sisesta e-posti aadress. Saadame kuuenumbrilise koodi, mis kehtib 10 minutit.",
          demo: "Demo: iga kuuenumbriline kood sobib, kuni e-posti saatmine on seadistatud.",
          email: "E-posti aadress",
          send: "Saada kood",
          verify: "Kinnita",
          inviteTitle: "Sõbrakonto kutse",
          inviteP: "Sisesta kood, mille autor sulle saatis.",
          invite: "Kutsekood",
          redeem: "Sisene",
          payTitle: "Täisligipääs — 5 €",
          payP: "Ühekordne makse. Pärast kinnitust avaneb kogu raamat lugejas.",
          pay: "Maksa ja ava raamat",
          close: "Sulge",
          invalid: "Kood ei sobinud. Proovi uuesti.",
          unknown: "Selle aadressiga kontot ei ole. Osta ligipääs või kasuta sõbrakoodi.",
        }
      : {
          loginTitle: "Sign in with a one-time code",
          loginP: "Enter your e-mail. We send a six-digit code valid for 10 minutes.",
          demo: "Demo: any six-digit code works until e-mail delivery is configured.",
          email: "E-mail address",
          send: "Send code",
          verify: "Confirm",
          inviteTitle: "Friend-account invitation",
          inviteP: "Enter the code the author sent you.",
          invite: "Invitation code",
          redeem: "Enter",
          payTitle: "Full access — €5",
          payP: "One payment. After confirmation the whole book opens in the reader.",
          pay: "Pay and open the book",
          close: "Close",
          invalid: "That code did not work. Try again.",
          unknown: "No account with this address. Buy access, or use a friend invite.",
        };

  async function goRead() {
    await onGranted();
    onClose();
    await navigate({ to: "/read" });
  }

  async function onSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!sent) {
        const res = await requestOtp({ data: { email } });
        if (!res.sent || res.unknown) {
          setError(copy.unknown);
          return;
        }
        setSent(true);
        setHint(res.mock ? copy.demo : null);
        return;
      }
      const res = await verifyOtp({ data: { email, code } });
      if (!res.ok) {
        setError(copy.invalid);
        return;
      }
      await goRead();
    } catch {
      setError(copy.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await redeemInvite({
        data: email ? { token: invite, email } : { token: invite },
      });
      if (!res.ok) {
        setError(copy.invalid);
        return;
      }
      await goRead();
    } catch {
      setError(copy.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await startCheckout({ data: { email } });
      if (!res.ok) {
        setError(copy.invalid);
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
        return;
      }
      await goRead();
    } catch {
      setError(copy.invalid);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "invite" ? copy.inviteTitle : mode === "purchase" ? copy.payTitle : copy.loginTitle;
  const lead = mode === "invite" ? copy.inviteP : mode === "purchase" ? copy.payP : copy.loginP;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-5 backdrop-blur-md">
      <div className="animate-veil w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{lead}</p>
        {hint && <p className="mt-3 text-sm text-primary">{hint}</p>}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        {mode === "login" && (
          <form className="mt-7 space-y-4" onSubmit={onSendOtp}>
            <EmailField label={copy.email} value={email} onChange={setEmail} />
            {sent && (
              <div>
                <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {t("reader.unlock")}
                </span>
                <div className="mt-2 flex justify-center" data-testid="access-otp">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}
            <Submit busy={busy}>{sent ? copy.verify : copy.send}</Submit>
          </form>
        )}

        {mode === "invite" && (
          <form className="mt-7 space-y-4" onSubmit={onInvite}>
            <EmailField label={copy.email} value={email} onChange={setEmail} required={false} />
            <label className="block">
              <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {copy.invite}
              </span>
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                required
                placeholder="METSAVAGI-FRIEND"
                className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 font-[family-name:var(--font-ui)] text-sm tracking-[0.12em] text-foreground uppercase outline-none focus:border-primary"
              />
            </label>
            <Submit busy={busy}>{copy.redeem}</Submit>
          </form>
        )}

        {mode === "purchase" && (
          <form className="mt-7 space-y-4" onSubmit={onPay}>
            <EmailField label={copy.email} value={email} onChange={setEmail} />
            <Submit busy={busy}>{copy.pay}</Submit>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {copy.close}
        </button>
      </div>
    </div>
  );
}

function EmailField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <input
        type="email"
        required={required}
        data-testid="access-email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="nimi@näide.ee"
        className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function Submit({ children, busy }: { children: React.ReactNode; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      data-testid="access-submit"
      className="w-full rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
