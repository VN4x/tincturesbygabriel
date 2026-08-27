import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAccess } from "@/lib/access-context";
import { reportProgress, submitInbox } from "@/lib/admin.functions";

type Flow = "paginated" | "scrolled";
type Theme = "forest" | "parchment" | "light";

const CFI_KEY = "metsavagi.cfi";
const BOOKMARK_KEY = "metsavagi.bookmark";
const FONT_KEY = "metsavagi.font";
const THEME_KEY = "metsavagi.theme";
const FLOW_KEY = "metsavagi.flow";

type TocItem = { label?: string; href?: string; subitems?: TocItem[] };

type FoliateView = HTMLElement & {
  open: (file: Blob | string) => Promise<void>;
  goTo: (target: string | number | { fraction: number }) => Promise<void>;
  prev: () => Promise<void>;
  next: () => Promise<void>;
  book?: { toc?: TocItem[]; metadata?: { title?: string } };
  renderer?: HTMLElement & { setStyles?: (css: string) => void };
};

const THEMES: Record<Theme, { bg: string; fg: string; link: string }> = {
  forest: { bg: "#0b1512", fg: "#f3ead2", link: "#d4a017" },
  parchment: { bg: "#f3ead2", fg: "#1a1710", link: "#7a4e12" },
  light: { bg: "#fbfaf6", fg: "#161616", link: "#3d6b4f" },
};

function flattenToc(items: TocItem[] = [], depth = 0): { label: string; href: string; depth: number }[] {
  const out: { label: string; href: string; depth: number }[] = [];
  for (const item of items) {
    if (item.label && item.href) out.push({ label: item.label, href: item.href, depth });
    if (item.subitems?.length) out.push(...flattenToc(item.subitems, depth + 1));
  }
  return out;
}

export function FoliateReader({ src }: { src: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const { t } = useLang();
  const { entitlement } = useAccess();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<{ label: string; href: string; depth: number }[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [font, setFont] = useState(() => Number(localStorage.getItem(FONT_KEY) ?? 18));
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || "forest");
  const [flow, setFlow] = useState<Flow>(() => (localStorage.getItem(FLOW_KEY) as Flow) || "paginated");
  const [bookmarked, setBookmarked] = useState(false);
  const [cfi, setCfi] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueBody, setIssueBody] = useState("");
  const [issueSent, setIssueSent] = useState(false);
  const lastProgressAt = useRef(0);

  const applyChrome = useCallback((view: FoliateView, next: { font: number; theme: Theme; flow: Flow }) => {
    const renderer = view.renderer;
    if (!renderer) return;
    renderer.setAttribute("flow", next.flow);
    if (next.flow === "paginated") renderer.setAttribute("animated", "");
    else renderer.removeAttribute("animated");
    const colors = THEMES[next.theme];
    renderer.setStyles?.(
      `html { background: ${colors.bg} !important; color: ${colors.fg} !important; }
       body { background: transparent !important; color: inherit !important; font-family: "EB Garamond", Garamond, serif; font-size: ${next.font}px; line-height: 1.55; }
       a { color: ${colors.link} !important; }`,
    );
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    (async () => {
      try {
        await import("foliate-js/view.js");
        const res = await fetch(src, { credentials: "include" });
        if (!res.ok) throw new Error(res.status === 401 ? "unauthorized" : "unavailable");
        const blob = await res.blob();
        if (cancelled) return;

        host.replaceChildren();
        const view = document.createElement("foliate-view") as FoliateView;
        view.style.display = "block";
        view.style.height = "100%";
        view.style.width = "100%";
        host.append(view);
        viewRef.current = view;

        view.addEventListener("relocate", ((ev: Event) => {
          const detail = (ev as CustomEvent).detail as { fraction?: number; cfi?: string };
          if (typeof detail.fraction === "number") {
            setProgress(detail.fraction);
            const now = Date.now();
            if (now - lastProgressAt.current > 20000) {
              lastProgressAt.current = now;
              void reportProgress({ data: { progress: detail.fraction } });
            }
          }
          if (detail.cfi) {
            setCfi(detail.cfi);
            localStorage.setItem(CFI_KEY, detail.cfi);
            setBookmarked(localStorage.getItem(BOOKMARK_KEY) === detail.cfi);
          }
        }) as EventListener);

        const file = new File([blob], "metsa-vagi.epub", { type: "application/epub+zip" });
        await view.open(file);
        const saved = localStorage.getItem(CFI_KEY);
        if (saved) {
          try {
            await view.goTo(saved);
          } catch {
            /* first open */
          }
        }
        setToc(flattenToc(view.book?.toc));
        applyChrome(view, {
          font: Number(localStorage.getItem(FONT_KEY) ?? 18),
          theme: (localStorage.getItem(THEME_KEY) as Theme) || "forest",
          flow: (localStorage.getItem(FLOW_KEY) as Flow) || "paginated",
        });
        setReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err instanceof Error ? err.message : "failed");
      }
    })();

    return () => {
      cancelled = true;
      host.replaceChildren();
      viewRef.current = null;
    };
  }, [src, applyChrome]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready) return;
    localStorage.setItem(FONT_KEY, String(font));
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(FLOW_KEY, flow);
    applyChrome(view, { font, theme, flow });
  }, [font, theme, flow, ready, applyChrome]);

  async function jumpFraction(value: number) {
    const view = viewRef.current;
    if (!view) return;
    try {
      await view.goTo({ fraction: value });
    } catch {
      /* unsupported target */
    }
  }

  async function goToc(href: string) {
    await viewRef.current?.goTo(href);
    setTocOpen(false);
  }

  function toggleBookmark() {
    if (!cfi) return;
    if (localStorage.getItem(BOOKMARK_KEY) === cfi) {
      localStorage.removeItem(BOOKMARK_KEY);
      setBookmarked(false);
    } else {
      localStorage.setItem(BOOKMARK_KEY, cfi);
      setBookmarked(true);
    }
  }

  async function restoreBookmark() {
    const mark = localStorage.getItem(BOOKMARK_KEY);
    if (mark) await viewRef.current?.goTo(mark);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.12em] uppercase">
        <button type="button" className="rounded-full border border-border px-3 py-1 hover:border-primary" onClick={() => setTocOpen((v) => !v)}>
          {t("full.toc")}
        </button>
        <label className="flex items-center gap-2 text-muted-foreground">
          {t("full.zoom")}
          <input
            type="range"
            min={14}
            max={28}
            value={font}
            onChange={(e) => setFont(Number(e.target.value))}
            className="w-24 accent-primary"
          />
        </label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="rounded-sm border border-input bg-background px-2 py-1"
        >
          <option value="forest">{t("full.themeForest")}</option>
          <option value="parchment">{t("full.themeParchment")}</option>
          <option value="light">{t("full.themeLight")}</option>
        </select>
        <select
          value={flow}
          onChange={(e) => setFlow(e.target.value as Flow)}
          className="rounded-sm border border-input bg-background px-2 py-1"
        >
          <option value="paginated">{t("full.paginated")}</option>
          <option value="scrolled">{t("full.scrolled")}</option>
        </select>
        <button type="button" className="rounded-full border border-border px-3 py-1 hover:border-primary" onClick={toggleBookmark}>
          {bookmarked ? t("full.bookmarked") : t("full.bookmark")}
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1 hover:border-primary" onClick={() => void restoreBookmark()}>
          {t("full.gotoBookmark")}
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1 hover:border-primary" onClick={() => setIssueOpen(true)}>
          {t("full.issue")}
        </button>
        <span className="ml-auto text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>

      <div className="relative min-h-0 flex-1">
        {tocOpen && (
          <aside className="absolute inset-y-0 left-0 z-20 w-72 overflow-y-auto border-r border-border bg-card/95 p-4 backdrop-blur-md">
            <p className="mb-3 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-primary uppercase">
              {t("full.toc")}
            </p>
            {toc.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => void goToc(item.href)}
                className="block w-full py-1.5 text-left font-[family-name:var(--font-display)] text-sm text-foreground/85 hover:text-primary"
                style={{ paddingLeft: 8 + item.depth * 12 }}
              >
                {item.label}
              </button>
            ))}
          </aside>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-muted-foreground">
            {t("reader.loading")}
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-muted-foreground">
            {error === "unauthorized" ? t("full.unauthorized") : t("full.unavailable")}
          </div>
        )}
        <div ref={hostRef} className="h-full w-full" />
        {issueOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 p-5 backdrop-blur-md">
            <div className="w-full max-w-md rounded-sm border border-border bg-card p-6">
              <h2 className="font-[family-name:var(--font-display)] text-xl">{t("full.issue")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("full.issueP")}</p>
              {issueSent ? (
                <p className="mt-5 text-sm text-primary">{t("full.issueSent")}</p>
              ) : (
                <form
                  className="mt-5 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = entitlement?.email;
                    if (!email) return;
                    void submitInbox({ data: { kind: "issue", email, body: issueBody } }).then((res) => {
                      if (res.ok) setIssueSent(true);
                    });
                  }}
                >
                  <textarea
                    required
                    minLength={8}
                    rows={4}
                    value={issueBody}
                    onChange={(e) => setIssueBody(e.target.value)}
                    className="w-full resize-none rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-primary px-4 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase"
                  >
                    {t("full.issueSend")}
                  </button>
                </form>
              )}
              <button
                type="button"
                className="mt-4 w-full text-[11px] tracking-[0.16em] text-muted-foreground uppercase"
                onClick={() => {
                  setIssueOpen(false);
                  setIssueSent(false);
                  setIssueBody("");
                }}
              >
                {t("full.close")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2">
        <button type="button" className="text-sm text-primary" onClick={() => void viewRef.current?.prev()}>
          ←
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => void jumpFraction(Number(e.target.value) / 1000)}
          className="flex-1 accent-primary"
          aria-label={t("full.progress")}
        />
        <button type="button" className="text-sm text-primary" onClick={() => void viewRef.current?.next()}>
          →
        </button>
      </div>
    </div>
  );
}
