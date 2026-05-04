import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EditorialPillar = "padrao_relacional" | "funcao_emocional" | "transformacao" | "qualidade_relacional" | "descanso";
export type EditorialObjective = "identificacao" | "autoridade" | "atrair_paciente" | "ensinar" | "descanso";
export type EditorialFormat = "reel" | "carrossel" | "stories" | "legenda" | "repost" | "descanso";

export interface EditorialDay {
  weekday: "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo";
  pillar: EditorialPillar;
  objective: EditorialObjective;
  format: EditorialFormat;
  suggestion: string;
}

export interface EditorialLine {
  id: string;
  week_start: string;
  scope: string;
  plan: { days: EditorialDay[] };
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Calcula a segunda-feira da semana atual em ISO
export function currentWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dom, 1 = seg
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_INDEX: Record<EditorialDay["weekday"], number> = {
  segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6,
};

export function dayISOFromWeekday(weekStart: string, weekday: EditorialDay["weekday"]): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + WEEKDAY_INDEX[weekday]);
  return d.toISOString().slice(0, 10);
}

export function weekdayFromISO(iso: string, weekStart: string): EditorialDay["weekday"] | null {
  const start = new Date(weekStart + "T00:00:00").getTime();
  const target = new Date(iso + "T00:00:00").getTime();
  const diff = Math.round((target - start) / (1000 * 60 * 60 * 24));
  const order: EditorialDay["weekday"][] = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
  return order[diff] ?? null;
}

export const useEditorialLine = (weekStart: string) =>
  useQuery({
    queryKey: ["editorial_lines", weekStart],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("editorial_lines")
        .select("*")
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EditorialLine | null;
    },
  });

export const useGenerateEditorialLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_start: string; focus?: string; recent_titles?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("editorial-line-generator", {
        body: { focus: input.focus, recent_titles: input.recent_titles },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const plan = data as { days: EditorialDay[] };

      const { data: row, error: e2 } = await (supabase as any)
        .from("editorial_lines")
        .upsert({ week_start: input.week_start, plan }, { onConflict: "week_start" })
        .select().single();
      if (e2) throw e2;
      return row as EditorialLine;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["editorial_lines", v.week_start] });
      toast.success("Linha editorial gerada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar linha"),
  });
};

export const useUpdateEditorialDay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { line: EditorialLine; weekday: EditorialDay["weekday"]; patch: Partial<EditorialDay> }) => {
      const days = input.line.plan.days.map((d) => d.weekday === input.weekday ? { ...d, ...input.patch } : d);
      const { error } = await (supabase as any).from("editorial_lines").update({ plan: { days } }).eq("id", input.line.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["editorial_lines", v.line.week_start] }),
  });
};
