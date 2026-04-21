export const formatBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const formatDateBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
};

export const formatDateLong = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const endOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const startOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay(); // 0 = sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // monday start
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
};

export const endOfWeekISO = () => addDaysISO(startOfWeekISO(), 6);
