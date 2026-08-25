import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import teasers from "@/content/teasers.json";
import { SiteHeader } from "@/components/SiteHeader";
import { useLang } from "@/lib/i18n";
import heroForest from "@/assets/hero-forest.jpg";
import tinctures from "@/assets/tinctures.jpg";
import engravingBirch from "@/assets/engraving-birch.png";
import engravingJuniper from "@/assets/engraving-juniper.png";

type Teaser = {
  id: string;
  kind: string;
  label: string;
  title: string;
  page: number;
  words: number;
  teaser: string;
  fade: string;
};

const sections = (teasers as { sections: Teaser[] }).sections;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Metsa vägi ja tervis — puude tinktuuride raamat | Gabriel Corpus" },
      {
        name: "description",
        content:
          "Gabriel Corpuse raamat puude ja põõsaste tinktuuridest: rahvapärimus, maagia ja ultraheli-ekstraktsioon. Sirvi tasuta juhuslikke peatükke, ava täisligipääs.",
      },
      { property: "og:title", content: "Metsa vägi ja tervis — puude tinktuuride raamat" },
      {
        property: "og:description",
        content:
          "29 peatükki metsa väest: pärimus, maagiline tähendus ja tänapäevane tinktuuritehnika. Tasuta proovilõigud igal külastusel.",
      },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Book",
          name: "Metsa vägi ja tervis",
          author: { "@type": "Person", name: "Gabriel Corpus" },
          inLanguage: ["et", "en"],
          numberOfPages: 131,
          bookFormat: "https://schema.org/EBook",
          copyrightYear: 2026,
          about: "Puude ja põõsaste tinktuurid, rahvameditsiin, etümoloogia ja ultraheli-ekstraktsioon",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useLang();
  const chapters = useMemo(() => sections.filter((s) => s.kind === "chapter"), []);
  const words = useMemo(() => sections.reduce((sum, s) => sum + s.words, 0), []);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section id="raamat" className="relative flex min-h-screen items-center overflow-hidden">
        <img
          src={heroForest}
          alt="Kuuvalguses kuusemets, udu puutüvede vahel"
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--forest-deep)_95%)]" />

        <img
          src={engravingBirch}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1024}
          height={1024}
          className="animate-drift pointer-events-none absolute -top-10 -left-24 w-[28rem] opacity-[0.07]"
        />

        <div className="relative mx-auto w-full max-w-4xl px-5 pt-28 pb-24 text-center sm:px-8">
          <p className="animate-veil font-[family-name:var(--font-ui)] text-[11px] tracking-[0.32em] text-primary uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1 className="animate-veil text-glow mt-7 font-[family-name:var(--font-display)] text-5xl leading-[1.02] text-foreground sm:text-7xl md:text-8xl">
            {t("hero.title")}
          </h1>
          <span className="mx-auto mt-9 block h-px w-40 rule-gold" />
          <p className="mx-auto mt-8 max-w-2xl font-[family-name:var(--font-display)] text-lg leading-relaxed text-foreground/80 sm:text-xl">
            {t("hero.sub")}
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] text-xl text-primary italic sm:text-2xl">
            {t("hero.quote")}
          </p>

          <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/lugemine"
              className="rounded-full bg-primary px-8 py-3.5 font-[family-name:var(--font-ui)] text-[12px] font-medium tracking-[0.18em] text-primary-foreground uppercase shadow-(--shadow-glow) transition-transform hover:-translate-y-0.5"
            >
              {t("hero.cta")}
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full border border-border px-8 py-3.5 font-[family-name:var(--font-ui)] text-[12px] tracking-[0.18em] text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
            >
              {t("hero.cta2")}
            </button>
          </div>

          <p className="mt-8 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            {t("hero.meta")}
          </p>
        </div>
      </section>

      {/* ── Premise ──────────────────────────────────────── */}
      <section className="border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Kicker>{t("premise.kicker")}</Kicker>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-5xl">
            {t("premise.title")}
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-sm border border-border/70 bg-border/40 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card/60 p-8 sm:p-10">
                <span className="font-[family-name:var(--font-display)] text-3xl text-primary/70">
                  {String(n).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl text-foreground">
                  {t(`premise.${n}.h`)}
                </h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
                  {t(`premise.${n}.p`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inside the book ──────────────────────────────── */}
      <section id="sisu" className="relative border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-2xl">
              <Kicker>{t("inside.kicker")}</Kicker>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-5xl">
                {t("inside.title")}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">{t("inside.lead")}</p>
            </div>
            <dl className="grid grid-cols-3 gap-8 font-[family-name:var(--font-ui)]">
              <Stat value={String(chapters.length)} label={t("inside.chapters")} />
              <Stat value="131" label={t("reader.page")} />
              <Stat value={words.toLocaleString("et-EE")} label={t("inside.words")} />
            </dl>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {chapters.slice(0, 9).map((c) => (
              <article
                key={c.id}
                className="group relative overflow-hidden rounded-sm border border-border/70 bg-card/50 p-7 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.22em] text-primary uppercase">
                    {c.label}
                  </span>
                  <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    {t("inside.locked")}
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl leading-snug text-foreground">
                  {c.title}
                </h3>
                <p className="mt-4 text-[18px] leading-relaxed text-foreground/75">{c.teaser}</p>
                {c.fade && (
                  <p className="mt-3 locked-text text-[18px] leading-relaxed" aria-hidden="true">
                    {c.fade}
                  </p>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              to="/lugemine"
              className="rounded-full border border-primary/60 px-7 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {t("inside.all")}
            </Link>
            <p className="font-[family-name:var(--font-ui)] text-xs text-muted-foreground">
              {chapters
                .slice(9, 16)
                .map((c) => c.title.split(/[–—(]/)[0]?.trim())
                .join(" · ")}
              …
            </p>
          </div>
        </div>
      </section>

      {/* ── Free sample ──────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-2">
          <div>
            <Kicker>{t("sample.kicker")}</Kicker>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-foreground sm:text-5xl">
              {t("sample.title")}
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">{t("sample.p")}</p>
            <Link
              to="/lugemine"
              className="mt-9 inline-block rounded-full bg-primary px-8 py-3.5 font-[family-name:var(--font-ui)] text-[12px] tracking-[0.18em] text-primary-foreground uppercase shadow-(--shadow-glow) transition-transform hover:-translate-y-0.5"
            >
              {t("sample.cta")}
            </Link>
          </div>
          <div className="relative">
            <img
              src={tinctures}
              alt="Merevaikklaasist tinktuuripudelid küünlavalguses, männioks ja tammekoor"
              loading="lazy"
              width={1280}
              height={1600}
              className="w-full rounded-sm object-cover shadow-(--shadow-plate)"
            />
            <div className="absolute inset-0 rounded-sm ring-1 ring-border ring-inset" />
          </div>
        </div>
      </section>

      {/* ── Access ───────────────────────────────────────── */}
      <section id="ligipaas" className="border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center">
            <Kicker center>{t("access.kicker")}</Kicker>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-5xl">
              {t("access.title")}
            </h2>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {(["free", "full", "friend"] as const).map((tier) => {
              const featured = tier === "full";
              return (
                <div
                  key={tier}
                  className={`relative flex flex-col rounded-sm border p-8 sm:p-10 ${
                    featured
                      ? "border-primary/50 bg-card shadow-(--shadow-glow)"
                      : "border-border/70 bg-card/40"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.18em] text-primary-foreground uppercase">
                      {t("access.badge")}
                    </span>
                  )}
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
                    {t(`access.${tier}.h`)}
                  </h3>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-primary">
                    {t(`access.${tier}.price`)}
                  </p>
                  <p className="mt-5 flex-1 text-[17px] leading-relaxed text-muted-foreground">
                    {t(`access.${tier}.p`)}
                  </p>
                  {tier === "free" ? (
                    <Link
                      to="/lugemine"
                      className="mt-8 rounded-full border border-border px-6 py-3 text-center font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
                    >
                      {t(`access.${tier}.cta`)}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLoginOpen(true)}
                      className={`mt-8 rounded-full px-6 py-3 text-center font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] uppercase transition-opacity ${
                        featured
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "border border-border text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {t(`access.${tier}.cta`)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center font-[family-name:var(--font-ui)] text-xs text-muted-foreground">
            {t("access.note")}
          </p>
        </div>
      </section>

      {/* ── Author ───────────────────────────────────────── */}
      <section id="autor" className="relative overflow-hidden border-t border-border/60 py-24 sm:py-32">
        <img
          src={engravingJuniper}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1024}
          height={1024}
          className="animate-drift pointer-events-none absolute -right-20 -bottom-24 w-[26rem] opacity-[0.06]"
        />
        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <Kicker center>{t("author.kicker")}</Kicker>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-5xl">
            {t("author.title")}
          </h2>
          <span className="mx-auto mt-8 block h-px w-28 rule-gold" />
          <p className="mt-8 text-[18px] leading-relaxed text-muted-foreground">{t("author.p1")}</p>
          <p className="mt-8 font-[family-name:var(--font-display)] text-xl leading-relaxed text-foreground/85 italic">
            {t("author.p2")}
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="border-t border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <Kicker>{t("faq.kicker")}</Kicker>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-5xl">
            {t("faq.title")}
          </h2>
          <div className="mt-12 divide-y divide-border/70 border-y border-border/70">
            {[1, 2, 3, 4].map((n) => (
              <details key={n} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between gap-6 font-[family-name:var(--font-display)] text-lg text-foreground marker:content-none">
                  {t(`faq.${n}.q`)}
                  <span className="font-[family-name:var(--font-ui)] text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                  {t(`faq.${n}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/60">
        <img
          src={heroForest}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center sm:px-8">
          <h2 className="text-glow font-[family-name:var(--font-display)] text-4xl text-foreground sm:text-6xl">
            {t("cta.title")}
          </h2>
          <p className="mt-6 text-[18px] leading-relaxed text-muted-foreground">{t("cta.p")}</p>
          <Link
            to="/lugemine"
            className="mt-10 inline-block rounded-full bg-primary px-9 py-4 font-[family-name:var(--font-ui)] text-[12px] tracking-[0.2em] text-primary-foreground uppercase shadow-(--shadow-glow) transition-transform hover:-translate-y-0.5"
          >
            {t("hero.cta")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 text-center font-[family-name:var(--font-ui)] text-xs text-muted-foreground sm:px-8">
          <p className="font-[family-name:var(--font-display)] text-base tracking-[0.18em] text-foreground uppercase">
            Metsa vägi ja tervis
          </p>
          <p>Autoriõigus © 2026 Gabriel Corpus. {t("footer.rights")}</p>
          <p>{t("footer.set")}</p>
        </div>
      </footer>

      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
    </div>
  );
}

function Kicker({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`font-[family-name:var(--font-ui)] text-[10px] tracking-[0.3em] text-primary uppercase ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </p>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-[family-name:var(--font-display)] text-3xl text-primary">{value}</dd>
      <dt className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{label}</dt>
    </div>
  );
}

/** Designed entry point for the one-time-code sign-in. Not wired to a backend yet. */
function LoginDialog({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const copy =
    lang === "et"
      ? {
          title: "Sisene ühekordse koodiga",
          p: "Sisesta e-posti aadress. Saadame kuuenumbrilise koodi, mis kehtib 10 minutit.",
          email: "E-posti aadress",
          send: "Saada kood",
          code: "Kood e-postist",
          verify: "Kinnita",
          friend: "Sõbrakonto kutse saab autorilt.",
          soon: "Sisselogimine ja maksed lülitatakse sisse enne avaldamist.",
          close: "Sulge",
        }
      : {
          title: "Sign in with a one-time code",
          p: "Enter your e-mail address. We send a six-digit code valid for 10 minutes.",
          email: "E-mail address",
          send: "Send code",
          code: "Code from e-mail",
          verify: "Confirm",
          friend: "Friend-account invitations come from the author.",
          soon: "Sign-in and payments are switched on before launch.",
          close: "Close",
        };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-5 backdrop-blur-md">
      <div className="animate-veil w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">{copy.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.p}</p>

        <form
          className="mt-7 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nimi@näide.ee"
              className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          {sent && (
            <label className="block">
              <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {copy.code}
              </span>
              <input
                inputMode="numeric"
                maxLength={6}
                placeholder="······"
                className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-center font-[family-name:var(--font-ui)] text-lg tracking-[0.6em] text-foreground outline-none focus:border-primary"
              />
            </label>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
          >
            {sent ? copy.verify : copy.send}
          </button>
        </form>

        <p className="mt-5 font-[family-name:var(--font-ui)] text-[11px] leading-relaxed text-muted-foreground">
          {copy.friend} {copy.soon}
        </p>

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
