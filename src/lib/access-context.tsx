import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getEntitlement, signOut } from "@/lib/access.functions";
import type { Entitlement } from "@/lib/access";

export type AccessMode = "login" | "invite" | "purchase";

type Ctx = {
  entitlement: Entitlement | null;
  loading: boolean;
  mode: AccessMode;
  open: boolean;
  refresh: () => Promise<void>;
  openAccess: (mode?: AccessMode) => void;
  closeAccess: () => void;
  logout: () => Promise<void>;
};

const AccessContext = createContext<Ctx | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AccessMode>("login");

  const refresh = useCallback(async () => {
    try {
      const ent = await getEntitlement();
      setEntitlement(ent);
    } catch {
      setEntitlement(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOut();
    setEntitlement(null);
  }, []);

  const value = useMemo(
    () => ({
      entitlement,
      loading,
      mode,
      open,
      refresh,
      openAccess: (next: AccessMode = "login") => {
        setMode(next);
        setOpen(true);
      },
      closeAccess: () => setOpen(false),
      logout,
    }),
    [entitlement, loading, mode, open, refresh, logout],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}
