import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { completeStripeSession, getEntitlement, issueBookUrl } from "@/lib/access.functions";
import { useLang } from "@/lib/i18n";

const FoliateReader = lazy(() =>
  import("@/components/FoliateReader").then((m) => ({ default: m.FoliateReader })),
);

export const Route = createFileRoute("/read")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
    const id = search["session_id"];
    return typeof id === "string" ? { session_id: id } : {};
  },
  beforeLoad: async ({ search }) => {
    if (search.session_id) {
      const paid = await completeStripeSession({ data: { sessionId: search.session_id } });
      if (!paid.ok) throw redirect({ to: "/" });
    }
    const ent = await getEntitlement();
    if (!ent) throw redirect({ to: "/" });
  },
  loader: async () => issueBookUrl(),
  component: FullReaderPage,
});

function FullReaderPage() {
  const book = Route.useLoaderData();
  const { t } = useLang();
  const navigate = useNavigate();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (book.ok) setSrc(book.url);
    else void navigate({ to: "/" });
  }, [book, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="reader" />
      <div className="pt-16">
        {src ? (
          <Suspense
            fallback={
              <div className="flex h-[70vh] items-center justify-center text-muted-foreground">
                {t("reader.loading")}
              </div>
            }
          >
            <FoliateReader src={src} />
          </Suspense>
        ) : (
          <div className="flex h-[70vh] items-center justify-center text-muted-foreground">
            {t("reader.loading")}
          </div>
        )}
      </div>
    </div>
  );
}
