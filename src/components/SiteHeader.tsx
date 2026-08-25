import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useAccess } from "@/lib/access-context";
import { useSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase-env";

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

function AccountControls() {
  const { user, isAdmin, hasBook, signOut } = useSession();
  const { entitlement, openAccess, logout } = useAccess();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cloud = isSupabaseConfigured();

  if (cloud && !user) {
    return (
      <Link
        to="/auth"
        className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        {t("nav.signin")}
      </Link>
    );
  }

  if (cloud && user) {
    return (
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            to="/admin"
            className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary uppercase transition-opacity hover:opacity-80"
          >
            Admin
          </Link>
        )}
        {(hasBook || entitlement) && (
          <Link
            to="/read"
            className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary uppercase"
          >
            {t("nav.fullRead")}
          </Link>
        )}
        <button
          type="button"
          onClick={async () => {
            await queryClient.cancelQueries();
            queryClient.clear();
            await signOut();
            await logout();
            void navigate({ to: "/", replace: true });
          }}
          className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("nav.signout")}
        </button>
      </div>
    );
  }

  if (entitlement) {
    return (
      <div className="flex items-center gap-3">
        <Link
          to="/read"
          className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary uppercase"
        >
          {t("nav.fullRead")}
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground"
        >
          {t("nav.logout")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAccess("login")}
      className="font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground"
    >
      {t("nav.login")}
    </button>
  );
}

export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "reader" }) {
  const { t } = useLang();
  const { entitlement, openAccess } = useAccess();
  const { hasBook } = useSession();
  const canRead = Boolean(entitlement || hasBook);

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
          <AccountControls />
          <LangToggle />
          {variant === "landing" ? (
            <Link
              to={canRead ? "/read" : "/lugemine"}
              className="rounded-full border border-primary/60 px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {canRead ? t("nav.fullRead") : t("nav.read")}
            </Link>
          ) : canRead ? (
            <Link
              to="/read"
              className="rounded-full bg-primary px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase"
            >
              {t("nav.fullRead")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAccess("purchase")}
              className="rounded-full bg-primary px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
            >
              {t("reader.unlock")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
