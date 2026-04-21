import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

export type ScopeFilter = "todos" | "pessoal" | "profissional";

const STORAGE_KEY = "lifeos.scope";

const ScopeContext = createContext<{
  scope: ScopeFilter;
  setScope: (s: ScopeFilter) => void;
} | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<ScopeFilter>(() => {
    if (typeof window === "undefined") return "todos";
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === "pessoal" || saved === "profissional" || saved === "todos") ? saved : "todos";
  });

  const setScope = useCallback((s: ScopeFilter) => {
    setScopeState(s);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  const value = useMemo(() => ({ scope, setScope }), [scope, setScope]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}

/** Filtra qualquer array por scope. Items sem scope passam quando filter = todos. */
export function filterByScope<T extends { scope?: string | null }>(items: T[], scope: ScopeFilter): T[] {
  if (scope === "todos") return items;
  return items.filter((i) => i.scope === scope);
}

/** Retorna o scope a forçar em novos registros, ou um default para "todos". */
export function defaultScope(scope: ScopeFilter, fallback: "pessoal" | "profissional" = "pessoal"): "pessoal" | "profissional" {
  return scope === "todos" ? fallback : scope;
}
