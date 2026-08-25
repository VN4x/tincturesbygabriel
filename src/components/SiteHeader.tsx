import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 rounded-full border border-border px-1 py-0.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.14em] uppercase">
      {(["et", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={
            lang === code
              ? "rounded-full bg-primary px-2.5 py-1 text-primary-foreground"
              : "rounded-full px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "reader" }) {
  const { t } = useLang();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
            Metsa vägi
          </span>
          <span className="hidden font-[family-name:var(--font-ui)] text-[10px] tracking-[0.24em] text-muted-foreground uppercase sm:inline">
            Gabriel Corpus
          </span>
        </Link>

        <nav className="hidden items-center gap-7 font-[family-name:var(--font-ui)] text-[12px] tracking-[0.16em] uppercase md:flex">
          {variant === "landing" ? (
            <>
              <a href="#raamat" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.book")}
              </a>
              <a href="#sisu" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.inside")}
              </a>
              <a href="#ligipaas" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.access")}
              </a>
              <a href="#autor" className="text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.author")}
              </a>
            </>
          ) : (
            <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
              {t("reader.back")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle />
          {variant === "landing" ? (
            <Link
              to="/lugemine"
              className="rounded-full border border-primary/60 px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {t("nav.read")}
            </Link>
          ) : (
            <a
              href="/#ligipaas"
              className="rounded-full bg-primary px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
            >
              {t("reader.unlock")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
