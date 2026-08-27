import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

// `supabase.auth.oauth` is beta and not in the generated types yet.
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the session lives in browser storage, absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Seda ühenduspäringut ei saanud avada: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "rakendus";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Autoriseerimisserver ei tagastanud suunamist.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-8 shadow-(--shadow-plate)">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          Ühenda {clientName} oma kontoga
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          See lubab {clientName}il kasutada raamatu tööriistu sinu kontona: sinu ligipääs, sinu peatükid, sinu
          sõnumid. Ligipääsu saad hiljem tühistada.
        </p>
        {error && (
          <p role="alert" className="mt-5 font-[family-name:var(--font-ui)] text-[11px] text-destructive">
            {error}
          </p>
        )}
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Luba
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border px-6 py-3 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.18em] text-foreground uppercase disabled:opacity-60"
          >
            Keeldu
          </button>
        </div>
      </div>
    </main>
  );
}
