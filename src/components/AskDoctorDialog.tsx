import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import doctorAvatar from "@/assets/mock/gabriel-45.jpg";

export function AskDoctorDialog({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const { user } = useSession();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed-in senders always write under their own verified account e-mail.
  const accountEmail = user?.email ?? null;
  useEffect(() => {
    if (accountEmail) setEmail(accountEmail);
  }, [accountEmail]);


  const copy =
    lang === "et"
      ? {
          title: "Küsi doktorilt",
          p: "Kirjuta oma küsimus taimedest, tinktuuridest või raamatust. Sõnum jõuab autori ADMIN-paneeli.",
          email: "Sinu e-post",
          msg: "Sinu küsimus",
          send: "Saada sõnum",
          done: "Sõnum on saadetud ADMIN-paneeli. Doktor vastab e-postiga.",
          close: "Sulge",
        }
      : {
          title: "Ask the doctor",
          p: "Write your question about plants, tinctures or the book. It arrives in the author's ADMIN panel.",
          email: "Your e-mail",
          msg: "Your question",
          send: "Send message",
          done: "Message sent to the ADMIN panel. The doctor replies by e-mail.",
          close: "Close",
        };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-5 backdrop-blur-md">
      <div className="animate-veil w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <div className="flex items-center gap-4">
          <img
            src={doctorAvatar}
            alt=""
            aria-hidden="true"
            width={256}
            height={256}
            className="h-12 w-12 rounded-full border border-primary/40 object-cover"
          />
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">{copy.title}</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{copy.p}</p>

        {sent ? (
          <p className="mt-7 font-[family-name:var(--font-ui)] text-[12px] leading-relaxed text-primary">
            {copy.done}
          </p>
        ) : (
          <form
            className="mt-7 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError(null);
              const { error: insertError } = await supabase.from("messages").insert({
                email: email.trim().toLowerCase(),
                body: body.trim(),
                kind: "dm",
              });
              setBusy(false);
              if (insertError) {
                setError(lang === "et" ? "Saatmine ebaõnnestus. Proovi hiljem uuesti." : "Sending failed. Try again later.");
                return;
              }
              setSent(true);
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nimi@näide.ee"
                className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {copy.msg}
              </span>
              <textarea
                required
                rows={4}
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-2 w-full resize-none rounded-sm border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
              />
            </label>
            {error && (
              <p className="font-[family-name:var(--font-ui)] text-[11px] text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {copy.send}
            </button>
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
