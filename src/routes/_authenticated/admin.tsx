import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  answerMessage,
  claimFirstAdmin,
  createFriendAccount,
  getAdminOverview,
  listInvites,
  listMessages,
  listPeople,
  recordPurchase,
  revokeFriend,
} from "@/lib/admin.functions";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ADMIN — Metsa vägi ja tervis" },
      { name: "description", content: "Autori haldusvaade: lugejad, maksed, sõnumid ja lugemisstatistika." },
      { property: "og:title", content: "ADMIN — Metsa vägi ja tervis" },
      { property: "og:description", content: "Autori haldusvaade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <Shell>
      <p className="text-sm text-destructive">{error.message}</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Ei leitud.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

const TABS = ["overview", "people", "payments", "messages", "invites"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Ülevaade",
  people: "Lugejad",
  payments: "Maksed",
  messages: "Sõnumid",
  invites: "Sõbrakontod",
};

const eur = (cents: number) => `${(cents / 100).toFixed(2)} €`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("et-EE") : "—");

function AdminPage() {
  const { isAdmin, loading, refresh, signOut, user } = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const navigate = useNavigate();
  const claim = useServerFn(claimFirstAdmin);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Laen…</p>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-foreground">Ligipääs puudub</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Sinu konto ({user?.email}) ei ole admin. Kui see on esimene sisselogimine ja adminni pole veel määratud,
          saad admini rolli üks kord siitsamast võtta.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              const res = await claim({});
              setClaimMsg(res.ok ? "Admin roll antud." : "Admin on juba olemas.");
              await refresh();
            }}
            className="rounded-full bg-primary px-5 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase"
          >
            Võta admini roll
          </button>
          <Link
            to="/"
            className="rounded-full border border-border px-5 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-foreground uppercase"
          >
            Avalehele
          </Link>
        </div>
        {claimMsg && <p className="mt-4 text-sm text-primary">{claimMsg}</p>}
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.28em] text-primary uppercase">
            ADMIN
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-foreground">Metsa vägi ja tervis</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
          >
            Avaleht
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/", replace: true });
            }}
            className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
          >
            Logi välja
          </button>
        </div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setTab(x)}
            className={`rounded-full px-4 py-2 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.18em] uppercase transition-colors ${
              tab === x
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABEL[x]}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "overview" && <OverviewTab />}
        {tab === "people" && <PeopleTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "invites" && <InvitesTab />}
      </div>
    </Shell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-foreground">{value}</p>
    </div>
  );
}

function OverviewTab() {
  const fn = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn({}) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Laen…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const max = Math.max(1, ...data.readsByDay.map((d) => d.count));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Kontosid" value={String(data.readers)} />
        <Card label="Maksnud" value={String(data.paidCount)} />
        <Card label="Tulu" value={eur(data.revenueCents)} />
        <Card label="Sõbrakontod" value={String(data.friends)} />
        <Card label="Avatud sõnumid" value={String(data.openMessages)} />
        <Card label="Lugemisi kokku" value={String(data.readsTotal)} />
        <Card label="Lugemisi 30 p" value={String(data.reads30d)} />
      </div>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-foreground">Lugemised päevade lõikes</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {data.readsByDay.length === 0 && <p className="text-sm text-muted-foreground">Andmeid veel pole.</p>}
          {data.readsByDay.map((d) => (
            <div key={d.day} className="flex-1" title={`${d.day}: ${d.count}`}>
              <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.count / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-foreground">Loetuimad peatükid (30 p)</h2>
        <ul className="mt-4 space-y-2">
          {data.topSections.map((s) => (
            <li key={s.section_id} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
              <span className="text-foreground">{s.section_id}</span>
              <span className="text-muted-foreground">{s.count}</span>
            </li>
          ))}
          {data.topSections.length === 0 && <li className="text-sm text-muted-foreground">Andmeid veel pole.</li>}
        </ul>
      </section>
    </div>
  );
}

function PeopleTab() {
  const fn = useServerFn(listPeople);
  const revoke = useServerFn(revokeFriend);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "people"], queryFn: () => fn({}) });
  const revokeMut = useMutation({
    mutationFn: (userId: string) => revoke({ data: { userId } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Laen…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          <tr>
            <th className="pb-3">Kontakt</th>
            <th className="pb-3">Liitus</th>
            <th className="pb-3">Rollid</th>
            <th className="pb-3">Makstud</th>
            <th className="pb-3">Viimane makse</th>
            <th className="pb-3">Lugemisi</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((p) => (
            <tr key={p.id} className="border-t border-border/60">
              <td className="py-3">
                <span className="text-foreground">{p.email ?? "—"}</span>
                {p.display_name && <span className="block text-xs text-muted-foreground">{p.display_name}</span>}
              </td>
              <td className="py-3 text-muted-foreground">{day(p.created_at)}</td>
              <td className="py-3 text-muted-foreground">{p.roles.join(", ") || "—"}</td>
              <td className="py-3 text-muted-foreground">{p.paidCents ? eur(p.paidCents) : "—"}</td>
              <td className="py-3 text-muted-foreground">{day(p.lastPaidAt)}</td>
              <td className="py-3 text-muted-foreground">{p.reads}</td>
              <td className="py-3 text-right">
                {p.roles.includes("friend") && (
                  <button
                    type="button"
                    onClick={() => revokeMut.mutate(p.id)}
                    className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase hover:text-destructive"
                  >
                    Võta sõbraroll
                  </button>
                )}
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-muted-foreground">
                Kontosid veel pole.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTab() {
  const fn = useServerFn(listPeople);
  const record = useServerFn(recordPurchase);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "people"], queryFn: () => fn({}) });
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      record({
        data: {
          email: email.trim().toLowerCase(),
          amountCents: Math.round(Number(amount) * 100),
          note: note.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setMsg("Makse salvestatud.");
      setEmail("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const payers = (data ?? []).filter((p) => p.paidCents > 0);

  return (
    <div className="space-y-8">
      <form
        className="grid gap-3 rounded-sm border border-border bg-card p-5 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          mut.mutate();
        }}
      >
        <input
          type="email"
          required
          placeholder="ostja e-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="viide / märkus"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-primary-foreground uppercase"
        >
          Lisa makse
        </button>
        {msg && <p className="sm:col-span-4 text-sm text-primary">{msg}</p>}
      </form>

      <table className="w-full text-left text-sm">
        <thead className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          <tr>
            <th className="pb-3">Ostja</th>
            <th className="pb-3">Summa</th>
            <th className="pb-3">Viimane makse</th>
          </tr>
        </thead>
        <tbody>
          {payers.map((p) => (
            <tr key={p.id} className="border-t border-border/60">
              <td className="py-3 text-foreground">{p.email ?? "—"}</td>
              <td className="py-3 text-muted-foreground">{eur(p.paidCents)}</td>
              <td className="py-3 text-muted-foreground">{day(p.lastPaidAt)}</td>
            </tr>
          ))}
          {payers.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-muted-foreground">
                Makseid veel pole.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MessagesTab() {
  const fn = useServerFn(listMessages);
  const answer = useServerFn(answerMessage);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "messages"], queryFn: () => fn({}) });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: (v: { id: string; reply?: string; status: "new" | "answered" | "closed" }) => answer({ data: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Laen…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <ul className="space-y-4">
      {(data ?? []).map((m) => (
        <li key={m.id} className="rounded-sm border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-primary uppercase">
              {m.kind === "issue" ? "Probleem" : "DM"} · {m.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {m.email} · {new Date(m.created_at).toLocaleString("et-EE")}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground">{m.body}</p>
          {m.admin_reply && (
            <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed text-muted-foreground">
              {m.admin_reply}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="vastus (märkmena)"
              value={drafts[m.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
              className="min-w-[16rem] flex-1 rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => mut.mutate({ id: m.id, reply: drafts[m.id] || undefined, status: "answered" })}
              className="rounded-full bg-primary px-4 py-2 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-primary-foreground uppercase"
            >
              Märgi vastatuks
            </button>
            <button
              type="button"
              onClick={() => mut.mutate({ id: m.id, status: "closed" })}
              className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground"
            >
              Sulge
            </button>
          </div>
        </li>
      ))}
      {(data ?? []).length === 0 && <li className="text-sm text-muted-foreground">Sõnumeid veel pole.</li>}
    </ul>
  );
}

function InvitesTab() {
  const fn = useServerFn(listInvites);
  const create = useServerFn(createFriendAccount);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "invites"], queryFn: () => fn({}) });
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => create({ data: { email: email.trim().toLowerCase(), note: note.trim() || undefined } }),
    onSuccess: () => {
      setMsg("Sõbrakonto loodud. Nüüd saab see aadress ühekordse koodiga sisse.");
      setEmail("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="space-y-8">
      <form
        className="grid gap-3 rounded-sm border border-border bg-card p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          mut.mutate();
        }}
      >
        <input
          type="email"
          required
          placeholder="sõbra e-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="märkus"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-primary-foreground uppercase"
        >
          Loo sõbrakonto
        </button>
        {msg && <p className="sm:col-span-3 text-sm text-primary">{msg}</p>}
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laen…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            <tr>
              <th className="pb-3">E-post</th>
              <th className="pb-3">Märkus</th>
              <th className="pb-3">Loodud</th>
              <th className="pb-3">Sisenenud</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((i) => (
              <tr key={i.id} className="border-t border-border/60">
                <td className="py-3 text-foreground">{i.email}</td>
                <td className="py-3 text-muted-foreground">{i.note ?? "—"}</td>
                <td className="py-3 text-muted-foreground">{day(i.created_at)}</td>
                <td className="py-3 text-muted-foreground">{day(i.accepted_at)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted-foreground">
                  Kutseid veel pole.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
