import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useTransactions } from "./useData";
import { useAllGoalsProgress } from "./useGoalProgress";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, addDaysISO, startOfWeekISO, startOfMonthISO, endOfMonthISO } from "@/lib/format";
import { cashFlow } from "@/lib/finance";

export type ExecutionProfile = "alta" | "media" | "baixa" | "inconsistente";

export interface AdaptiveMetrics {
  execution_rate: number; // 0..100
  consistency_score: number; // 0..100
  overload_score: number; // 0..100
  abandonment_rate: number; // 0..100
  productive_days: number;
  unproductive_days: number;
  avg_tasks_per_day: number;
  current_load: number;
  daily_history: { date: string; planned: number; done: number }[];
  financial: { month_spend: number; avg_3m: number; deviation_pct: number };
}

export interface PerformanceProfile {
  id: string;
  week_start: string;
  scope: string;
  window_days: number;
  profile: ExecutionProfile;
  execution_rate: number;
  consistency_score: number;
  overload_score: number;
  abandonment_rate: number;
  productive_days: number;
  unproductive_days: number;
  avg_tasks_per_day: number;
  recommended_load: number;
  insights: any;
  narrative: string | null;
}

export interface PerformanceAdjustment {
  id: string;
  created_at: string;
  decided_at: string | null;
  scope: string;
  area: "carga" | "meta" | "foco" | "financeiro";
  goal_id: string | null;
  kind: string;
  status: "sugerido" | "aceito" | "rejeitado" | "expirado";
  rationale: string;
  payload: any;
}

/** Calcula métricas comportamentais determinísticas a partir de tarefas + transações. */
export function useAdaptiveMetrics(windowDays: 7 | 14 = 7): AdaptiveMetrics {
  const { scope } = useScope();
  const { data: tasksAll = [] } = useTasks();
  const { data: txnsAll = [] } = useTransactions();

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const txns = useMemo(() => filterByScope(txnsAll, scope), [txnsAll, scope]);

  return useMemo(() => {
    const today = todayISO();
    const daily: { date: string; planned: number; done: number }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = addDaysISO(today, -i);
      const dayTasks = (tasks as any[]).filter((t) => t.due_date === d);
      daily.push({
        date: d,
        planned: dayTasks.length,
        done: dayTasks.filter((t) => t.status === "concluida").length,
      });
    }

    const totalPlanned = daily.reduce((s, d) => s + d.planned, 0);
    const totalDone = daily.reduce((s, d) => s + d.done, 0);
    const execution_rate = totalPlanned === 0 ? 0 : Math.round((totalDone / totalPlanned) * 100);

    // Consistência: % de dias com taxa >= 60% (entre os dias com tarefas)
    const daysWithTasks = daily.filter((d) => d.planned > 0);
    const productive = daysWithTasks.filter((d) => d.done / d.planned >= 0.6);
    const unproductive = daysWithTasks.filter((d) => d.done / d.planned < 0.6);
    const consistency_score =
      daysWithTasks.length === 0
        ? 0
        : Math.round((productive.length / daysWithTasks.length) * 100);

    // Sobrecarga: dias com >5 planejadas
    const overloaded = daily.filter((d) => d.planned > 5).length;
    const overload_score = Math.round((overloaded / windowDays) * 100);

    // Abandono: tarefas com due_date no passado (>3d) ainda pendentes
    const cutoff = addDaysISO(today, -3);
    const abandoned = (tasks as any[]).filter(
      (t) => t.status !== "concluida" && t.due_date && t.due_date < cutoff,
    ).length;
    const totalActive = (tasks as any[]).filter((t) => t.status !== "concluida").length;
    const abandonment_rate =
      totalActive === 0 ? 0 : Math.round((abandoned / totalActive) * 100);

    const avg_tasks_per_day =
      daysWithTasks.length === 0
        ? 0
        : Number((totalPlanned / daysWithTasks.length).toFixed(1));

    // Carga atual: tarefas pendentes com prazo em D+1..D+7
    const tomorrow = addDaysISO(today, 1);
    const weekAhead = addDaysISO(today, 7);
    const upcoming = (tasks as any[]).filter(
      (t) => t.status !== "concluida" && t.due_date && t.due_date >= tomorrow && t.due_date <= weekAhead,
    );
    const current_load = upcoming.length === 0 ? 0 : Math.round(upcoming.length / 7);

    // Financeiro: gasto do mês vs média 3 meses
    const monthStart = startOfMonthISO();
    const monthEnd = endOfMonthISO();
    const month_spend = cashFlow(txns as any, monthStart, monthEnd).despesas;
    const past: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const ref = new Date();
      ref.setMonth(ref.getMonth() - i, 1);
      const s = ref.toISOString().slice(0, 10);
      const e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().slice(0, 10);
      past.push(cashFlow(txns as any, s, e).despesas);
    }
    const avg_3m = past.length === 0 ? 0 : past.reduce((a, b) => a + b, 0) / past.length;
    const deviation_pct =
      avg_3m === 0 ? 0 : Math.round(((month_spend - avg_3m) / avg_3m) * 100);

    return {
      execution_rate,
      consistency_score,
      overload_score,
      abandonment_rate,
      productive_days: productive.length,
      unproductive_days: unproductive.length,
      avg_tasks_per_day,
      current_load,
      daily_history: daily,
      financial: { month_spend, avg_3m, deviation_pct },
    };
  }, [tasks, txns, windowDays]);
}

/** Lê o perfil já persistido para a semana atual. */
export function useCurrentProfile() {
  const { scope } = useScope();
  const week_start = startOfWeekISO();
  return useQuery({
    queryKey: ["performance-profile", week_start, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_profiles")
        .select("*")
        .eq("week_start", week_start)
        .eq("scope", scope)
        .eq("window_days", 7)
        .maybeSingle();
      if (error) throw error;
      return data as PerformanceProfile | null;
    },
  });
}

/** Lê ajustes recentes (últimos 14d). */
export function useRecentAdjustments() {
  const { scope } = useScope();
  return useQuery({
    queryKey: ["performance-adjustments", scope],
    queryFn: async () => {
      const cutoff = addDaysISO(todayISO(), -14);
      const { data, error } = await supabase
        .from("performance_adjustments")
        .select("*")
        .eq("scope", scope)
        .gte("created_at", `${cutoff}T00:00:00Z`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PerformanceAdjustment[];
    },
  });
}

/** Invoca a edge function para (re)gerar o perfil + ajustes. */
export function useRunAdaptiveAnalysis() {
  const { scope } = useScope();
  const metrics = useAdaptiveMetrics(7);
  const goalsAll = useAllGoalsProgress();
  const recent = useRecentAdjustments();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const goals = filterByScope(goalsAll, scope).map((g: any) => ({
        id: g.id,
        name: g.name,
        pct: g.progress?.pct ?? 0,
        pace: g.progress?.pace ?? "sem_prazo",
        deadline: g.deadline,
        locked: g.locked ?? false,
      }));
      const { data, error } = await supabase.functions.invoke("adaptive-performance", {
        body: {
          week_start: startOfWeekISO(),
          scope,
          window_days: 7,
          metrics,
          goals,
          last_adjustments: (recent.data ?? []).slice(0, 10),
        },
      });
      if (error) throw error;
      return data as {
        profile: ExecutionProfile;
        recommended_load: number;
        narrative: string;
        adjustments: any[];
        insights: any;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-profile"] });
      qc.invalidateQueries({ queryKey: ["performance-adjustments"] });
    },
  });
}

/** Aceita / rejeita um ajuste. Aceitar aplica efeito quando aplicável (ex: cortar escopo de meta). */
export function useDecideAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      apply,
    }: {
      id: string;
      decision: "aceito" | "rejeitado";
      apply?: () => Promise<void>;
    }) => {
      if (decision === "aceito" && apply) await apply();
      const { error } = await supabase
        .from("performance_adjustments")
        .update({ status: decision, decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-adjustments"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

/** Toggle do campo `locked` em uma meta. */
export function useToggleGoalLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, locked }: { goalId: string; locked: boolean }) => {
      const { error } = await supabase.from("goals").update({ locked }).eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export const profileLabel: Record<ExecutionProfile, string> = {
  alta: "Alta execução",
  media: "Média execução",
  baixa: "Baixa execução",
  inconsistente: "Inconsistente",
};

export const profileStyle: Record<ExecutionProfile, string> = {
  alta: "text-success border-success/40 bg-success/5",
  media: "text-primary border-primary/40 bg-primary/5",
  baixa: "text-warning border-warning/40 bg-warning/5",
  inconsistente: "text-destructive border-destructive/40 bg-destructive/5",
};
