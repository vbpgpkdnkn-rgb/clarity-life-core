// Helpers para semanas (segunda como início)
export function startOfWeekFor(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekDates(weekStartISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartISO, i));
}

export function formatWeekRange(weekStartISO: string): string {
  const start = new Date(weekStartISO + "T00:00:00");
  const end = new Date(weekStartISO + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const f = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

export function dayName(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export function dayNumber(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
}

export function isToday(dateISO: string): boolean {
  return dateISO === new Date().toISOString().slice(0, 10);
}
