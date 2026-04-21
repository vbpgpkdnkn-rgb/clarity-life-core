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

const HORIZON_DAYS = 28; // 4 semanas

/** Gera/regenera tarefas recorrentes para um item das próximas 4 semanas.
 * Remove pendentes futuras existentes vinculadas e recria conforme weekdays.
 * Mantém tarefas já concluídas intactas. */
export async function syncRecurringTasks(src: RecurrenceSource): Promise<number> {
  if (!src.weekdays || src.weekdays.length === 0) {
    // Sem dias selecionados: limpar pendentes futuras
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
  // Limpa pendentes futuras (incluindo hoje) para esta origem
  await supabase
    .from("tasks")
    .delete()
    .eq("recurrence_source_table", src.table)
    .eq("recurrence_source_id", src.id)
    .eq("status", "pendente")
    .gte("due_date", today);

  // Datas alvo nos próximos HORIZON_DAYS
  const dates: string[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const iso = addDaysISO(today, i);
    const dow = new Date(iso + "T00:00:00").getDay();
    if (src.weekdays.includes(dow)) dates.push(iso);
  }

  if (dates.length === 0) return 0;

  const payload = dates.map((d) => ({
    title: src.title,
    due_date: d,
    priority: "media" as const,
    status: "pendente" as const,
    scope: (src.scope ?? "pessoal") as "pessoal" | "profissional",
    area_id: src.area_id ?? null,
    notes: src.notes ?? null,
    recurrence_source_table: src.table,
    recurrence_source_id: src.id,
  }));

  const { error } = await supabase.from("tasks").insert(payload);
  if (error) throw error;
  return payload.length;
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
