import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "lifeos.sidebarOrder.v1";

export function useSidebarOrder<T extends { url: string }>(defaultItems: T[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultItems.map((i) => i.url);
  });

  // Garante que novos itens (adicionados depois) entrem no final
  useEffect(() => {
    const known = new Set(order);
    const missing = defaultItems.filter((i) => !known.has(i.url)).map((i) => i.url);
    if (missing.length > 0) {
      const next = [...order, ...missing];
      setOrder(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    // remove obsoletos
    const validUrls = new Set(defaultItems.map((i) => i.url));
    const cleaned = order.filter((u) => validUrls.has(u));
    if (cleaned.length !== order.length) {
      setOrder(cleaned);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultItems.map((i) => i.url).join(",")]);

  const orderedItems = order
    .map((url) => defaultItems.find((i) => i.url === url))
    .filter(Boolean) as T[];

  const move = useCallback(
    (url: string, direction: "up" | "down") => {
      setOrder((curr) => {
        const idx = curr.indexOf(url);
        if (idx < 0) return curr;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= curr.length) return curr;
        const next = [...curr];
        [next[idx], next[target]] = [next[target], next[idx]];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    const def = defaultItems.map((i) => i.url);
    setOrder(def);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
  }, [defaultItems]);

  return { orderedItems, move, reset };
}
