import { supabase } from "@/integrations/supabase/client";
import { addDaysISO, todayISO } from "@/lib/format";

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const WEEKDAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export interface RecurrenceSource {
  table: "cleaning_tasks" | "habits" | "challenges" | "books";
  id: string;
  title: string;
  weekdays: number[]; // 0-6 (Sun-Sat)
  scope?: "pessoal" | "profissional";
  area_id?: string | null;
  notes?: string | null;
}

const HORIZON_DAYS = 60; // janela máxima para procurar próxima ocorrência

/** Calcula a próxima data >= fromISO que cai em algum dos weekdays. */
export function nextOccurrenceISO(weekdays: number[], fromISO: string): string | null {
  if (!weekdays || weekdays.length === 0) return null;
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const iso = addDaysISO(fromISO, i);
    const dow = new Date(iso + "T00:00:00").getDay();
    if (weekdays.includes(dow)) return iso;
  }
  return null;
}

/** Garante que existe UMA tarefa pendente para a próxima ocorrência da recorrência.
 *  - Se já houver uma tarefa pendente vinculada, mantém (atualiza dados básicos se mudou título/notes).
 *  - Se não houver, cria apenas a próxima ocorrência futura.
 *  - Se weekdays estiver vazio, remove pendentes futuras. */
export async function syncRecurringTasks(src: RecurrenceSource): Promise<number> {
  // Sem dias selecionados: limpar pendentes futuras
  if (!src.weekdays || src.weekdays.length === 0) {
    await supabase
      .from("tasks")
      .delete()
      .eq("recurrence_source_table", src.table)
      .eq("recurrence_source_id", src.id)
      .eq("status", "pendente")
      .gte("due_date", todayISO());
    return 0;
  }

  const today = todayISO();

  // Verifica se já existe tarefa pendente futura (ou hoje) para esta origem
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, due_date, title, notes")
    .eq("recurrence_source_table", src.table)
    .eq("recurrence_source_id", src.id)
    .eq("status", "pendente")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(1);

  if (existing && existing.length > 0) {
    const t = existing[0];
    // Atualiza título/notes se mudou (ex: usuário renomeou)
    const updates: any = {};
    if (t.title !== src.title) updates.title = src.title;
    if ((t.notes ?? null) !== (src.notes ?? null)) updates.notes = src.notes ?? null;
    if (Object.keys(updates).length > 0) {
      await supabase.from("tasks").update(updates).eq("id", t.id);
    }
    return 0;
  }

  // Calcula próxima ocorrência a partir de hoje
  const nextDate = nextOccurrenceISO(src.weekdays, today);
  if (!nextDate) return 0;

  const { error } = await supabase.from("tasks").insert({
    title: src.title,
    due_date: nextDate,
    priority: "media" as const,
    status: "pendente" as const,
    scope: (src.scope ?? "pessoal") as "pessoal" | "profissional",
    area_id: src.area_id ?? null,
    notes: src.notes ?? null,
    recurrence_source_table: src.table,
    recurrence_source_id: src.id,
  });
  if (error) throw error;
  return 1;
}

/** Cria a próxima ocorrência APÓS uma tarefa recorrente ser concluída.
 *  Busca os weekdays da origem e gera a próxima a partir do dia seguinte. */
export async function generateNextAfterCompletion(
  table: RecurrenceSource["table"],
  sourceId: string,
  completedDueDate: string,
): Promise<void> {
  // Lê configuração da origem
  const { data: src, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (error || !src) return;

  const weekdays: number[] = (src as any).weekdays ?? [];
  if (!weekdays || weekdays.length === 0) return;

  // Próxima ocorrência: dia seguinte ao concluído
  const startFrom = addDaysISO(completedDueDate, 1);
  const nextDate = nextOccurrenceISO(weekdays, startFrom);
  if (!nextDate) return;

  // Evita duplicar: se já existir pendente para esta origem em data >= startFrom, não cria
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("recurrence_source_table", table)
    .eq("recurrence_source_id", sourceId)
    .eq("status", "pendente")
    .gte("due_date", startFrom)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Monta título/notes conforme a origem
  let title = "";
  let notes: string | null = null;
  let area_id: string | null = (src as any).area_id ?? null;
  if (table === "cleaning_tasks") {
    title = (src as any).name;
    notes = (src as any).notes ?? null;
  } else if (table === "books") {
    title = `📖 Ler: ${(src as any).title}`;
    notes = (src as any).session_minutes ? `${(src as any).session_minutes} min de leitura` : null;
  } else if (table === "challenges") {
    title = `🎯 ${(src as any).name}${(src as any).daily_action ? `: ${(src as any).daily_action}` : ""}`;
  } else if (table === "habits") {
    title = (src as any).name;
  }
  if (!title) return;

  await supabase.from("tasks").insert({
    title,
    due_date: nextDate,
    priority: "media",
    status: "pendente",
    scope: "pessoal",
    area_id,
    notes,
    recurrence_source_table: table,
    recurrence_source_id: sourceId,
  });
}

/** Remove todas as tarefas pendentes futuras vinculadas a uma origem. */
export async function clearRecurringTasks(table: RecurrenceSource["table"], id: string) {
  await supabase
    .from("tasks")
    .delete()
    .eq("recurrence_source_table", table)
    .eq("recurrence_source_id", id)
    .eq("status", "pendente")
    .gte("due_date", todayISO());
}
