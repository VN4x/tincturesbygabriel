import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Access = {
  user: User | null;
  session: Session | null;
  roles: string[];
  isAdmin: boolean;
  /** True when the reader may open the whole book: admin, friend account, or a paid purchase. */
  hasBook: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Access | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadEntitlements(userId: string | undefined) {
    if (!userId) {
      setRoles([]);
      setPaid(false);
      return;
    }
    const [rolesRes, paidRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      // RLS narrows this to the reader's own purchases (by account or by verified e-mail).
      supabase.from("purchases").select("id").eq("status", "paid").limit(1),
    ]);
    setRoles((rolesRes.data ?? []).map((r) => r.role as string));
    setPaid((paidRes.data ?? []).length > 0);
  }

  useEffect(() => {
    let alive = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      setSession(next);
      if (event === "SIGNED_OUT") {
        setRoles([]);
        setPaid(false);
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session);
      await loadEntitlements(data.session?.user.id);
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    void loadEntitlements(userId);
  }, [userId]);

  const value = useMemo<Access>(() => {
    const isAdmin = roles.includes("admin");
    return {
      user: session?.user ?? null,
      session,
      roles,
      isAdmin,
      hasBook: isAdmin || roles.includes("friend") || paid,
      loading,
      refresh: () => loadEntitlements(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setRoles([]);
        setPaid(false);
      },
    };
  }, [session, roles, paid, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Access {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
