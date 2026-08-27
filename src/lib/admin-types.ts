import type { AccessSource } from "./access";

export type ReaderStatus = "active" | "revoked";
export type InboxKind = "dm" | "issue";
export type InboxStatus = "new" | "open" | "replied" | "closed";
export type LedgerEventType =
  | "purchase"
  | "invite"
  | "otp"
  | "admin_grant"
  | "revoke"
  | "read"
  | "login"
  | "inbox";

export type Reader = {
  email: string;
  source: AccessSource;
  status: ReaderStatus;
  createdAt: string;
  lastSeenAt: string;
  lastLoginAt?: string;
  note: string;
  stripeSessionId?: string;
  reads: number;
  lastProgress: number;
  lastChapter?: string;
};

export type InboxItem = {
  id: string;
  kind: InboxKind;
  email: string;
  body: string;
  createdAt: string;
  status: InboxStatus;
  reply?: string;
  repliedAt?: string;
};

export type LedgerEvent = {
  id: string;
  type: LedgerEventType;
  email?: string;
  at: string;
  meta?: Record<string, string | number>;
};

export type AdminStoreFile = {
  version: 1;
  readers: Record<string, Reader>;
  inbox: InboxItem[];
  events: LedgerEvent[];
};

export type DailyPoint = { day: string; reads: number; purchases: number; logins: number };

export type AdminDashboard = {
  memoryOnly: boolean;
  stats: {
    paid: number;
    invites: number;
    adminGrants: number;
    otp: number;
    active: number;
    revoked: number;
    reads: number;
    openDms: number;
    openIssues: number;
    revenueEur: number;
  };
  daily: DailyPoint[];
  readers: Reader[];
  inbox: InboxItem[];
};
