import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HabitGap {
  habit_id: string;
  habit_name: string;
  completion_rate: number;
  root_cause: string;
  suggestion: { action: string; detail: string; expected_impact: string };
}

export interface HabitGapResult {
  summary: string;
  gaps: HabitGap[];
  winning_pattern: string;
  next_test: string;
}

export const useHabitGapAnalyzer = () => {
  return useMutation({
    mutationFn: async (input: { habits: any[]; logs: any[]; window_days?: number }) => {
      const { data, error } = await supabase.functions.invoke("habit-gap-analyzer", { body: input });
      if (error) throw error;
      return data as HabitGapResult;
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na análise"),
  });
};

export const ROOT_CAUSE_LABEL: Record<string, string> = {
  horario_ruim: "Horário ruim",
  carga_excessiva: "Carga excessiva",
  falta_gatilho: "Falta de gatilho",
  ambiente: "Ambiente",
  energia_baixa: "Energia baixa",
  frequencia_alta: "Frequência alta demais",
  objetivo_vago: "Objetivo vago",
};

export const ACTION_LABEL: Record<string, string> = {
  mudar_horario: "Mudar horário",
  reduzir_frequencia: "Reduzir frequência",
  encadear_a_outro: "Encadear a outro hábito",
  simplificar: "Simplificar",
  pausar: "Pausar temporariamente",
  trocar_dia: "Trocar dia da semana",
};
