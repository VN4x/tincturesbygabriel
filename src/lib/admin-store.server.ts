import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AccessSource } from "./access";
import type {
  AdminDashboard,
  AdminStoreFile,
  DailyPoint,
  InboxItem,
  InboxKind,
  InboxStatus,
  LedgerEvent,
  LedgerEventType,
  Reader,
} from "./admin-types";

export type {
  AdminDashboard,
  AdminStoreFile,
  DailyPoint,
  InboxItem,
  InboxKind,
  InboxStatus,
  LedgerEvent,
  LedgerEventType,
  Reader,
  ReaderStatus,
} from "./admin-types";

const MAX_EVENTS = 5000;
const MAX_INBOX = 2000;
const PRICE_EUR = 5;

const empty = (): AdminStoreFile => ({ version: 1, readers: {}, inbox: [], events: [] });

let memory = empty();
let loaded = false;
let memoryOnly = false;
let warnedMemory = false;
let chain = Promise.resolve();

function storePath(): string {
  return process.env["ADMIN_STORE_PATH"] || resolve(process.cwd(), "private/admin-store.json");
}

function nowIso(): string {
  return new Date().toISOString();
}

function keyEmail(email: string): string {
  return email.toLowerCase().trim();
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function load(): Promise<AdminStoreFile> {
  if (loaded) return memory;
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as AdminStoreFile;
    if (parsed?.version === 1 && parsed.readers && parsed.inbox && parsed.events) {
      memory = parsed;
      memoryOnly = false;
    } else {
      memory = empty();
    }
  } catch {
    memory = empty();
  }
  loaded = true;
  return memory;
}

async function persist(next: AdminStoreFile): Promise<void> {
  memory = next;
  const path = storePath();
  try {
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(next), { encoding: "utf8", mode: 0o600 });
    await rename(tmp, path);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
    if (!warnedMemory) {
      warnedMemory = true;
      console.warn("[admin] store is memory-only on this host; set ADMIN_STORE_PATH on the Node/Podman server");
    }
  }
}

async function mutate(fn: (store: AdminStoreFile) => void): Promise<AdminStoreFile> {
  return withLock(async () => {
    const store = await load();
    fn(store);
    if (store.events.length > MAX_EVENTS) store.events = store.events.slice(-MAX_EVENTS);
    if (store.inbox.length > MAX_INBOX) store.inbox = store.inbox.slice(-MAX_INBOX);
    await persist(store);
    return store;
  });
}

function pushEvent(store: AdminStoreFile, type: LedgerEventType, email?: string, meta?: LedgerEvent["meta"]) {
  const ev: LedgerEvent = {
    id: crypto.randomUUID(),
    type,
    at: nowIso(),
  };
  if (email) ev.email = email;
  if (meta) ev.meta = meta;
  store.events.push(ev);
}

export function isMemoryOnly(): boolean {
  return memoryOnly;
}

/** Drop in-memory cache so tests can swap ADMIN_STORE_PATH between cases. */
export function resetAdminStoreCache(): void {
  memory = empty();
  loaded = false;
  memoryOnly = false;
  warnedMemory = false;
  chain = Promise.resolve();
}

export async function getActiveReader(email: string): Promise<Reader | null> {
  const store = await load();
  const reader = store.readers[keyEmail(email)];
  if (!reader || reader.status !== "active") return null;
  return reader;
}

export async function upsertGrant(input: {
  email: string;
  source: AccessSource;
  stripeSessionId?: string;
}): Promise<Reader> {
  const email = keyEmail(input.email);
  const at = nowIso();
  let saved: Reader | undefined;
  await mutate((store) => {
    const prev = store.readers[email];
    const source =
      prev?.source === "purchase"
        ? "purchase"
        : input.source === "otp" && prev
          ? prev.source
          : input.source;
    const reader: Reader = {
      email,
      source,
      status: "active",
      createdAt: prev?.createdAt || at,
      lastSeenAt: at,
      lastLoginAt: at,
      note: prev?.note || "",
      reads: prev?.reads || 0,
      lastProgress: prev?.lastProgress || 0,
    };
    const stripeId = input.stripeSessionId || prev?.stripeSessionId;
    if (stripeId) reader.stripeSessionId = stripeId;
    if (prev?.lastChapter) reader.lastChapter = prev.lastChapter;
    store.readers[email] = reader;
    saved = reader;
    const type: LedgerEventType =
      input.source === "purchase"
        ? "purchase"
        : input.source === "invite"
          ? "invite"
          : input.source === "admin"
            ? "admin_grant"
            : "otp";
    pushEvent(store, type, email);
    if (input.source === "otp") pushEvent(store, "login", email);
  });
  return saved as Reader;
}

export async function recordRead(email: string): Promise<void> {
  const key = keyEmail(email);
  await mutate((store) => {
    const reader = store.readers[key];
    if (!reader || reader.status !== "active") return;
    reader.reads += 1;
    reader.lastSeenAt = nowIso();
    pushEvent(store, "read", key);
  });
}

export async function recordProgress(email: string, progress: number, chapter?: string): Promise<void> {
  const key = keyEmail(email);
  await mutate((store) => {
    const reader = store.readers[key];
    if (!reader || reader.status !== "active") return;
    reader.lastProgress = Math.max(reader.lastProgress, Math.min(1, Math.max(0, progress)));
    reader.lastSeenAt = nowIso();
    if (chapter) reader.lastChapter = chapter.slice(0, 200);
  });
}

export async function addInbox(input: { kind: InboxKind; email: string; body: string }): Promise<InboxItem> {
  const email = keyEmail(input.email);
  const item: InboxItem = {
    id: crypto.randomUUID(),
    kind: input.kind,
    email,
    body: input.body.trim(),
    createdAt: nowIso(),
    status: "new",
  };
  await mutate((store) => {
    store.inbox.push(item);
    pushEvent(store, "inbox", email, { kind: input.kind });
  });
  return item;
}

export async function grantFromAdmin(email: string, note: string): Promise<Reader> {
  return upsertGrant({ email, source: "admin" }).then(async (reader) => {
    if (!note.trim()) return reader;
    await mutate((store) => {
      const row = store.readers[reader.email];
      if (row) row.note = note.trim().slice(0, 500);
    });
    return { ...reader, note: note.trim().slice(0, 500) };
  });
}

export async function revokeReader(email: string): Promise<boolean> {
  const key = keyEmail(email);
  let ok = false;
  await mutate((store) => {
    const reader = store.readers[key];
    if (!reader) return;
    reader.status = "revoked";
    reader.lastSeenAt = nowIso();
    ok = true;
    pushEvent(store, "revoke", key);
  });
  return ok;
}

export async function restoreReader(email: string): Promise<boolean> {
  const key = keyEmail(email);
  let ok = false;
  await mutate((store) => {
    const reader = store.readers[key];
    if (!reader) return;
    reader.status = "active";
    reader.lastSeenAt = nowIso();
    ok = true;
    pushEvent(store, "admin_grant", key);
  });
  return ok;
}

export async function updateReaderNote(email: string, note: string): Promise<boolean> {
  const key = keyEmail(email);
  let ok = false;
  await mutate((store) => {
    const reader = store.readers[key];
    if (!reader) return;
    reader.note = note.trim().slice(0, 500);
    ok = true;
  });
  return ok;
}

export async function updateInbox(input: {
  id: string;
  status: InboxStatus;
  reply?: string;
}): Promise<InboxItem | null> {
  let saved: InboxItem | null = null;
  await mutate((store) => {
    const item = store.inbox.find((row) => row.id === input.id);
    if (!item) return;
    item.status = input.status;
    if (typeof input.reply === "string") {
      item.reply = input.reply.trim().slice(0, 4000);
      item.repliedAt = nowIso();
      if (item.reply) item.status = "replied";
    }
    saved = item;
  });
  return saved;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function buildDashboard(): Promise<AdminDashboard> {
  const store = await load();
  const readers = Object.values(store.readers).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = readers.filter((r) => r.status === "active");
  const paid = active.filter((r) => r.source === "purchase").length;
  const invites = active.filter((r) => r.source === "invite").length;
  const adminGrants = active.filter((r) => r.source === "admin").length;
  const otp = active.filter((r) => r.source === "otp").length;
  const openDms = store.inbox.filter((i) => i.kind === "dm" && i.status !== "closed" && i.status !== "replied").length;
  const openIssues = store.inbox.filter((i) => i.kind === "issue" && i.status !== "closed" && i.status !== "replied").length;

  const days: DailyPoint[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, reads: 0, purchases: 0, logins: 0 });
  }
  const index = new Map(days.map((row) => [row.day, row]));
  for (const ev of store.events) {
    const row = index.get(dayKey(ev.at));
    if (!row) continue;
    if (ev.type === "read") row.reads += 1;
    if (ev.type === "purchase") row.purchases += 1;
    if (ev.type === "login" || ev.type === "otp") row.logins += 1;
  }

  return {
    memoryOnly,
    stats: {
      paid,
      invites,
      adminGrants,
      otp,
      active: active.length,
      revoked: readers.length - active.length,
      reads: readers.reduce((sum, r) => sum + r.reads, 0),
      openDms,
      openIssues,
      revenueEur: paid * PRICE_EUR,
    },
    daily: days,
    readers,
    inbox: [...store.inbox].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
