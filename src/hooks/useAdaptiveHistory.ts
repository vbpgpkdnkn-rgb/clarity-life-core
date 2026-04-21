import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/contexts/ScopeContext";
import { addDaysISO, startOfWeekISO } from "@/lib/format";
import type { ExecutionProfile } from "./useAdaptive";

export interface HistoryRow {
  week_start: string;
  profile: ExecutionProfile;
  execution_rate: number;
  consistency_score: number;
  overload_score: number;
  abandonment_rate: number;
  avg_tasks_per_day: number;
  recommended_load: number;
  narrative: string | null;
}

export interface EvolutionDelta {
  label: string;
  current: number;
  previous: number;
  delta: number; // pp
  direction: "up" | "down" | "flat";
  positive: boolean; // true se direção é boa
}

export interface EvolutionSummary {
  weeks_count: number;
  current?: HistoryRow;
  fourWeeksAgo?: HistoryRow;
  best?: HistoryRow;
  worst?: HistoryRow;
  trend12: HistoryRow[];
  deltas: EvolutionDelta[];
  profileChanged: boolean;
  trajectory: "melhorando" | "piorando" | "estavel" | "sem_dados";
}

const NARRATIVE_KIND = "evolution_narrative";

/** Lê últimas 12 semanas do escopo atual. */
export function useAdaptiveHistory() {
  const { scope } = useScope();
  return useQuery({
    queryKey: ["performance-history", scope],
    queryFn: async () => {
      const cutoff = addDaysISO(startOfWeekISO(), -7 * 14);
      const { data, error } = await supabase
        .from("performance_profiles")
        .select(
          "week_start, profile, execution_rate, consistency_score, overload_score, abandonment_rate, avg_tasks_per_day, recommended_load, narrative",
        )
        .eq("scope", scope)
        .eq("window_days", 7)
        .gte("week_start", cutoff)
        .order("week_start", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });
}

function dir(delta: number, threshold = 2): "up" | "down" | "flat" {
  if (delta > threshold) return "up";
  if (delta < -threshold) return "down";
  return "flat";
}

/** Sumariza evolução: deltas semana atual vs ~4 sem atrás + tendência 12 sem. */
export function useEvolutionSummary(): EvolutionSummary {
  const { data: rows = [] } = useAdaptiveHistory();
  return useMemo(() => {
    if (rows.length === 0) {
      return {
        weeks_count: 0,
        trend12: [],
        deltas: [],
        profileChanged: false,
        trajectory: "sem_dados",
      };
    }
    const trend12 = rows.slice(-12);
    const current = rows[rows.length - 1];
    // alvo: 4 semanas atrás (índice atual -4); se não houver, pega o mais antigo
    const targetIdx = Math.max(0, rows.length - 1 - 4);
    const fourWeeksAgo = rows[targetIdx];

    const best = [...rows].sort((a, b) => b.execution_rate - a.execution_rate)[0];
    const worst = [...rows].sort((a, b) => a.execution_rate - b.execution_rate)[0];

    const dExec = Math.round(current.execution_rate - fourWeeksAgo.execution_rate);
    const dCons = Math.round(current.consistency_score - fourWeeksAgo.consistency_score);
    const dOver = Math.round(current.overload_score - fourWeeksAgo.overload_score);
    const dAban = Math.round(current.abandonment_rate - fourWeeksAgo.abandonment_rate);

    const deltas: EvolutionDelta[] = [
      {
        label: "Execução",
        current: current.execution_rate,
        previous: fourWeeksAgo.execution_rate,
        delta: dExec,
        direction: dir(dExec),
        positive: dExec >= 0,
      },
      {
        label: "Consistência",
        current: current.consistency_score,
        previous: fourWeeksAgo.consistency_score,
        delta: dCons,
        direction: dir(dCons),
        positive: dCons >= 0,
      },
      {
        label: "Sobrecarga",
        current: current.overload_score,
        previous: fourWeeksAgo.overload_score,
        delta: dOver,
        direction: dir(dOver),
        positive: dOver <= 0,
      },
      {
        label: "Abandono",
        current: current.abandonment_rate,
        previous: fourWeeksAgo.abandonment_rate,
        delta: dAban,
        direction: dir(dAban),
        positive: dAban <= 0,
      },
    ];

    // trajetória: regressão simples sobre execution_rate dos últimos pontos
    const slope =
      trend12.length >= 3
        ? linearSlope(trend12.map((r) => Number(r.execution_rate)))
        : 0;
    const trajectory: EvolutionSummary["trajectory"] =
      slope > 0.8 ? "melhorando" : slope < -0.8 ? "piorando" : "estavel";

    return {
      weeks_count: rows.length,
      current,
      fourWeeksAgo,
      best,
      worst,
      trend12,
      deltas,
      profileChanged: current.profile !== fourWeeksAgo.profile,
      trajectory,
    };
  }, [rows]);
}

function linearSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xs = ys.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Cache da última narrativa de evolução em ai_insights (kind='evolution_narrative'). */
export function useEvolutionNarrative() {
  const { scope } = useScope();
  return useQuery({
    queryKey: ["evolution-narrative", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("payload, created_at")
        .eq("scope", scope)
        .eq("kind", NARRATIVE_KIND)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateEvolutionNarrative() {
  const { scope } = useScope();
  const summary = useEvolutionSummary();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "adaptive-evolution-narrative",
        {
          body: {
            scope,
            summary: {
              weeks_count: summary.weeks_count,
              current: summary.current,
              fourWeeksAgo: summary.fourWeeksAgo,
              best: summary.best,
              worst: summary.worst,
              deltas: summary.deltas,
              trajectory: summary.trajectory,
              profileChanged: summary.profileChanged,
            },
          },
        },
      );
      if (error) throw error;
      return data as { narrative: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evolution-narrative"] });
    },
  });
}

export const trajectoryLabel: Record<EvolutionSummary["trajectory"], string> = {
  melhorando: "Em melhora",
  piorando: "Em queda",
  estavel: "Estável",
  sem_dados: "Sem histórico",
};

export const trajectoryStyle: Record<EvolutionSummary["trajectory"], string> = {
  melhorando: "text-success border-success/40 bg-success/5",
  piorando: "text-destructive border-destructive/40 bg-destructive/5",
  estavel: "text-muted-foreground border-border bg-muted/20",
  sem_dados: "text-muted-foreground border-dashed border-border bg-muted/10",
};
