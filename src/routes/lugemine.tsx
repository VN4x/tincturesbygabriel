import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getSample, type PublicSection, type Sample } from "@/lib/book.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { useLang } from "@/lib/i18n";
import { useAccess } from "@/lib/access-context";
import { AskDoctorDialog } from "@/components/AskDoctorDialog";
import engravingJuniper from "@/assets/engraving-juniper.png";

export const Route = createFileRoute("/lugemine")({
  head: () => ({
    meta: [
      { title: "Tasuta lugemisproov — Metsa vägi ja tervis" },
      {
        name: "description",
        content:
          "Loe tasuta juhuslikult avatud peatükke raamatust „Metsa vägi ja tervis“. Iga külastus avab uue lõigu puude tinktuuridest.",
      },
      { property: "og:title", content: "Tasuta lugemisproov — Metsa vägi ja tervis" },
      {
        property: "og:description",
        content: "Juhuslikult avatud peatükid Gabriel Corpuse tinktuuriraamatust. Ülejäänu ootab lukus.",
      },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  loader: async () => getSample(),
  component: ReaderPage,
});

const SIZES = ["text-[15px]", "text-[17px]", "text-[19px]", "text-[22px]"] as const;

function ReaderPage() {
  const initial = Route.useLoaderData() as Sample;
  const { t, lang } = useLang();
  const { entitlement, openAccess } = useAccess();
  const [sample, setSample] = useState<Sample>(initial);
  const [size, setSize] = useState(1);
  const [active, setActive] = useState<string>(sample.sections[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const open = useMemo(() => sample.sections.filter((s) => !s.locked), [sample]);

  useEffect(() => {
    const first = open[0];
    if (first) setActive(first.id);
  }, [open]);

  async function reshuffle() {
    setBusy(true);
    try {
      const next = await getSample();
      setSample(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="reader" />

      <div className="mx-auto flex max-w-7xl gap-10 px-5 pt-28 pb-32 sm:px-8">
        {/* Contents rail */}
        <aside className="sticky top-28 hidden h-[calc(100vh-12rem)] w-64 shrink-0 overflow-y-auto lg:block">
          <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            {t("reader.contents")}
          </p>
          <ol className="mt-4 space-y-1.5">
            {sample.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={`flex items-baseline gap-2 py-1 text-[13px] leading-snug transition-colors ${
                    active === s.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="mt-0.5 w-3 shrink-0 text-[10px] opacity-70">
                    {s.locked ? "·" : "◆"}
                  </span>
                  <span className={s.locked ? "opacity-70" : ""}>{shortTitle(s.title)}</span>
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Reading column */}
        <main className="min-w-0 flex-1">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.24em] text-primary uppercase">
                {t("reader.title")}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-foreground sm:text-4xl">
                {sample.title}
              </h1>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-muted-foreground">
                {sample.openCount} {t("reader.openCount")} · {sample.author}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {t("reader.textSize")}
                </span>
                <div className="flex overflow-hidden rounded-full border border-border">
                  {SIZES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${t("reader.textSize")} ${i + 1}`}
                      onClick={() => setSize(i)}
                      className={`px-2 py-1 text-[10px] transition-colors ${
                        size === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={reshuffle}
                disabled={busy}
                className="rounded-full border border-primary/50 px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.14em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {busy ? t("reader.loading") : t("reader.reshuffle")}
              </button>
            </div>
          </div>

          {lang === "en" && (
            <p className="mb-10 border-l-2 border-primary/50 pl-4 font-[family-name:var(--font-ui)] text-xs text-muted-foreground">
              {t("reader.enNote")}
            </p>
          )}

          <div className="space-y-16">
            {sample.sections.map((s) => (
              <SectionView
                key={s.id}
                section={s}
                sizeClass={SIZES[size] ?? SIZES[1]}
                onUnlock={() => openAccess("purchase")}
                onAsk={() => setAskOpen(true)}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Paywall bar */}
      <div className="fixed bottom-0 z-40 w-full border-t border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <p className="font-[family-name:var(--font-ui)] text-xs text-muted-foreground">{t("reader.bar")}</p>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {t("reader.back")}
            </Link>
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.14em] text-primary uppercase transition-colors hover:text-foreground"
            >
              {t("reader.dm")}
            </button>
            {entitlement ? (
              <Link
                to="/read"
                className="rounded-full bg-primary px-5 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
              >
                {t("nav.fullRead")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAccess("purchase")}
                className="rounded-full bg-primary px-5 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
              >
                {t("reader.unlock")}
              </button>
            )}
          </div>
        </div>
      </div>
      {askOpen && <AskDoctorDialog onClose={() => setAskOpen(false)} />}
    </div>
  );
}

function shortTitle(title: string) {
  const cut = title.split(/[–—(]/)[0]?.trim() ?? title;
  return cut.length > 34 ? `${cut.slice(0, 33)}…` : cut;
}

function SectionView({
  section,
  sizeClass,
  onUnlock,
  onAsk,
}: {
  section: PublicSection;
  sizeClass: string;
  onUnlock: () => void;
  onAsk: () => void;
}) {
  const { t } = useLang();
  const teaser = section.blocks[0];
  const teaserText = teaser && teaser.t === "p" ? teaser.text : "";
  const split = teaserText.split(/(?<=[.!?…])\s/);
  const visible = split[0] ?? "";
  const veiled = split.slice(1).join(" ");

  return (
    <article id={section.id} className="scroll-mt-28">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.24em] text-primary uppercase">
            {section.label || section.title}
          </span>
          <span className="h-px flex-1 rule-gold" />
          <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            {section.locked ? t("reader.locked") : t("reader.free")} · {t("reader.page")} {section.page}
          </span>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-foreground sm:text-3xl">
          {section.title}
        </h2>
      </header>

      {section.locked ? (
        <div className="relative overflow-hidden rounded-sm border border-border/70 bg-card/50 p-6 sm:p-8">
          <p className={`reader-column ${sizeClass} leading-[1.85] text-foreground/80`}>{visible}</p>
          {veiled && (
            <p className={`reader-column mt-4 locked-text ${sizeClass} leading-[1.85]`} aria-hidden="true">
              {veiled}
            </p>
          )}
          <div
            aria-hidden="true"
            className="mt-3 space-y-3 select-none"
          >
            {[92, 78, 96, 64].map((w, i) => (
              <div
                key={i}
                className="h-3.5 rounded-full bg-foreground/10 blur-[3px]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
            <p className="font-[family-name:var(--font-ui)] text-xs text-muted-foreground">
              {t("reader.lockedNote")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAsk}
                className="rounded-full border border-border px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-primary/60 hover:text-primary"
              >
                {t("reader.dm")}
              </button>
              <button
                type="button"
                onClick={onUnlock}
                className="rounded-full border border-primary/60 px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.14em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {t("reader.unlock")}
              </button>
            </div>
          </div>

          <img
            src={engravingJuniper}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={1024}
            height={1024}
            className="pointer-events-none absolute -right-16 -bottom-20 w-56 opacity-[0.05]"
          />
        </div>
      ) : (
        <div className="space-y-5">
          {section.blocks.map((b, i) => {
            if (b.t === "h3")
              return (
                <h3
                  key={i}
                  className="pt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-primary"
                >
                  {b.text}
                </h3>
              );
            if (b.t === "part")
              return (
                <p
                  key={i}
                  className="text-center font-[family-name:var(--font-display)] text-2xl tracking-[0.2em] text-primary uppercase"
                >
                  {b.text}
                </p>
              );
            if (b.t === "table")
              return (
                <div key={i} className="overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-left font-[family-name:var(--font-ui)] text-xs">
                    <tbody>
                      {b.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-border/60 last:border-0">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-muted-foreground">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            return (
              <p key={i} className={`reader-column ${sizeClass} leading-[1.9] text-foreground/90`}>
                {b.text}
              </p>
            );
          })}
        </div>
      )}
    </article>
  );
}
