import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  adminGrant,
  adminHandleInbox,
  adminLogout,
  adminSetNote,
  adminSetStatus,
  getAdminDashboard,
} from "@/lib/admin.functions";
import type { InboxItem, InboxStatus, Reader } from "@/lib/admin-types";
import { LangToggle } from "@/components/SiteHeader";
import { useLang } from "@/lib/i18n";

type Dashboard = Extract<Awaited<ReturnType<typeof getAdminDashboard>>, { ok: true }>;

function when(iso: string): string {
  try {
    return format(new Date(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}

function sourceLabel(source: Reader["source"], lang: string): string {
  const et = { purchase: "Ost", invite: "Kutse", admin: "Admin", otp: "OTP" };
  const en = { purchase: "Paid", invite: "Invite", admin: "Admin", otp: "OTP" };
  return (lang === "et" ? et : en)[source];
}

export function AdminPanel({ data }: { data: Dashboard }) {
  const { lang } = useLang();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "readers" | "inbox" | "issues">("overview");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const copy =
    lang === "et"
      ? {
          title: "Haldus",
          out: "Välju",
          memory: "See server ei saa faili kirjutada. Andmed on mälus ja kaovad taaskäivitusel. Tootmises kasuta Podman/Node ja ADMIN_STORE_PATH.",
          overview: "Ülevaade",
          readers: "Lugejad",
          dms: "Sõnumid",
          issues: "Probleemid",
          paid: "Tasunud",
          revenue: "Käive (5 €)",
          active: "Aktiivsed",
          reads: "Lugemisi",
          openDm: "Avatud DM",
          openIssue: "Avatud probleemid",
          grant: "Lisa sõbrakonto",
          note: "Märkus",
          add: "Lisa",
          search: "Otsi e-posti või märkust",
          created: "Loodud",
          seen: "Viimati",
          progress: "Edenemine",
          revoke: "Tühista",
          restore: "Taasta",
          save: "Salvesta",
          reply: "Vasta",
          close: "Sulge",
          open: "Ava",
          empty: "Kirjeid ei ole.",
        }
      : {
          title: "Admin",
          out: "Sign out",
          memory: "This host cannot write the ledger file. Data stays in memory and resets on restart. For production use the Podman Node server and ADMIN_STORE_PATH.",
          overview: "Overview",
          readers: "Readers",
          dms: "Messages",
          issues: "Issues",
          paid: "Paid",
          revenue: "Revenue (€5)",
          active: "Active",
          reads: "Reads",
          openDm: "Open DMs",
          openIssue: "Open issues",
          grant: "Grant friend access",
          note: "Note",
          add: "Add",
          search: "Search email or note",
          created: "Created",
          seen: "Last seen",
          progress: "Progress",
          revoke: "Revoke",
          restore: "Restore",
          save: "Save",
          reply: "Reply",
          close: "Close",
          open: "Open",
          empty: "Nothing here yet.",
        };

  async function refresh() {
    await router.invalidate();
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const filteredReaders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data.readers;
    return data.readers.filter(
      (r) => r.email.includes(needle) || r.note.toLowerCase().includes(needle) || r.source.includes(needle),
    );
  }, [data.readers, q]);

  const dms = data.inbox.filter((i) => i.kind === "dm");
  const issues = data.inbox.filter((i) => i.kind === "issue");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.28em] text-primary uppercase">
              Metsa vägi · {copy.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{data.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <button
              type="button"
              className="rounded-full border border-border px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground"
              onClick={() =>
                void run(async () => {
                  await adminLogout();
                  window.location.assign("/ops");
                })
              }
            >
              {copy.out}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {data.memoryOnly && (
          <p className="mb-6 rounded-sm border border-primary/40 bg-card px-4 py-3 text-sm text-primary">{copy.memory}</p>
        )}
        {message && <p className="mb-4 text-sm text-primary">{message}</p>}

        <nav className="mb-8 flex flex-wrap gap-2">
          {(
            [
              ["overview", copy.overview],
              ["readers", copy.readers],
              ["inbox", copy.dms],
              ["issues", copy.issues],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] uppercase ${
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <section className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label={copy.paid} value={String(data.stats.paid)} />
              <Stat label={copy.revenue} value={`${data.stats.revenueEur} €`} />
              <Stat label={copy.active} value={String(data.stats.active)} />
              <Stat label={copy.reads} value={String(data.stats.reads)} />
              <Stat label={copy.openDm} value={String(data.stats.openDms)} />
              <Stat label={copy.openIssue} value={String(data.stats.openIssues)} />
            </div>
            <div className="rounded-sm border border-border bg-card p-5">
              <p className="mb-4 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                14 {lang === "et" ? "päeva" : "days"}
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily}>
                    <CartesianGrid stroke="rgba(212,160,23,0.12)" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} stroke="#8a8373" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#8a8373" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "#121a16", border: "1px solid #2a3a32", color: "#f3ead2" }}
                    />
                    <Bar dataKey="reads" name={copy.reads} fill="#d4a017" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="purchases" name={copy.paid} fill="#3d6b4f" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="logins" name="Login" fill="#8a8373" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {tab === "readers" && (
          <section className="space-y-6">
            <form
              className="grid gap-3 rounded-sm border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const res = await adminGrant({ data: { email: grantEmail, note: grantNote } });
                  if (res.ok) {
                    setGrantEmail("");
                    setGrantNote("");
                    setMessage(grantEmail);
                  }
                });
              }}
            >
              <label className="block">
                <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {copy.grant}
                </span>
                <input
                  type="email"
                  required
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="sober@naide.ee"
                  className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {copy.note}
                </span>
                <input
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="KOL / friend / press"
                  className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="self-end rounded-full bg-primary px-5 py-2 font-[family-name:var(--font-ui)] text-[11px] tracking-[0.16em] text-primary-foreground uppercase disabled:opacity-60"
              >
                {copy.add}
              </button>
            </form>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={copy.search}
              className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="border-b border-border bg-card font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2">E-post</th>
                    <th className="px-3 py-2">{copy.created}</th>
                    <th className="px-3 py-2">{copy.seen}</th>
                    <th className="px-3 py-2">{copy.reads}</th>
                    <th className="px-3 py-2">{copy.progress}</th>
                    <th className="px-3 py-2">{copy.note}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredReaders.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-muted-foreground" colSpan={7}>
                        {copy.empty}
                      </td>
                    </tr>
                  )}
                  {filteredReaders.map((reader) => (
                    <ReaderRow
                      key={reader.email}
                      reader={reader}
                      lang={lang}
                      copy={copy}
                      busy={busy}
                      onRun={run}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "inbox" && <InboxList items={dms} copy={copy} busy={busy} onRun={run} empty={copy.empty} />}
        {tab === "issues" && <InboxList items={issues} copy={copy} busy={busy} onRun={run} empty={copy.empty} />}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card px-5 py-4">
      <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-primary">{value}</p>
    </div>
  );
}

function ReaderRow({
  reader,
  lang,
  copy,
  busy,
  onRun,
}: {
  reader: Reader;
  lang: string;
  copy: { revoke: string; restore: string; save: string };
  busy: boolean;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState(reader.note);
  return (
    <tr className="border-b border-border/70 align-top">
      <td className="px-3 py-3">
        <a className="text-foreground hover:text-primary" href={`mailto:${reader.email}`}>
          {reader.email}
        </a>
        <p className="mt-1 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {sourceLabel(reader.source, lang)} · {reader.status}
        </p>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{when(reader.createdAt)}</td>
      <td className="px-3 py-3 text-muted-foreground">{when(reader.lastSeenAt)}</td>
      <td className="px-3 py-3">{reader.reads}</td>
      <td className="px-3 py-3">{Math.round(reader.lastProgress * 100)}%</td>
      <td className="px-3 py-3">
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-40 rounded-sm border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={busy}
            className="text-[10px] tracking-[0.12em] text-primary uppercase"
            onClick={() => void onRun(() => adminSetNote({ data: { email: reader.email, note } }))}
          >
            {copy.save}
          </button>
        </div>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          disabled={busy}
          className="text-[10px] tracking-[0.12em] text-destructive uppercase"
          onClick={() =>
            void onRun(() =>
              adminSetStatus({
                data: { email: reader.email, status: reader.status === "revoked" ? "active" : "revoked" },
              }),
            )
          }
        >
          {reader.status === "revoked" ? copy.restore : copy.revoke}
        </button>
      </td>
    </tr>
  );
}

function InboxList({
  items,
  copy,
  busy,
  onRun,
  empty,
}: {
  items: InboxItem[];
  copy: { reply: string; close: string; open: string };
  busy: boolean;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <InboxCard key={item.id} item={item} copy={copy} busy={busy} onRun={onRun} />
      ))}
    </ul>
  );
}

function InboxCard({
  item,
  copy,
  busy,
  onRun,
}: {
  item: InboxItem;
  copy: { reply: string; close: string; open: string };
  busy: boolean;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [reply, setReply] = useState(item.reply || "");
  return (
    <li className="rounded-sm border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a className="text-sm text-primary" href={`mailto:${item.email}`}>
          {item.email}
        </a>
        <p className="font-[family-name:var(--font-ui)] text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {item.status} · {when(item.createdAt)}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body}</p>
      {item.reply && <p className="mt-3 text-sm text-muted-foreground">{item.reply}</p>}
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        className="mt-4 w-full resize-none rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-full bg-primary px-4 py-1.5 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] text-primary-foreground uppercase"
          onClick={() =>
            void onRun(() => adminHandleInbox({ data: { id: item.id, status: "replied" satisfies InboxStatus, reply } }))
          }
        >
          {copy.reply}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-full border border-border px-4 py-1.5 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] uppercase"
          onClick={() => void onRun(() => adminHandleInbox({ data: { id: item.id, status: "open" } }))}
        >
          {copy.open}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-full border border-border px-4 py-1.5 font-[family-name:var(--font-ui)] text-[10px] tracking-[0.16em] uppercase"
          onClick={() => void onRun(() => adminHandleInbox({ data: { id: item.id, status: "closed" } }))}
        >
          {copy.close}
        </button>
      </div>
    </li>
  );
}
