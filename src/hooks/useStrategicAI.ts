import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useTransactions, useAccounts } from "./useData";
import { useAllGoalsProgress } from "./useGoalProgress";
import { useEvents } from "./usePlanner";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, addDaysISO, startOfMonthISO, endOfMonthISO } from "@/lib/format";
import { balancesByScope, cashFlow } from "@/lib/finance";
import { useMemo } from "react";

export interface Cut {
  task_id: string;
  title: string;
  reason: string;
  action: "remover" | "adiar" | "delegar";
}
export interface CriticalAlert {
  kind: "risco_meta" | "queda_produtividade" | "desequilibrio_vida" | "risco_financeiro" | "sobrecarga";
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  action: string;
}
export interface GoalDiagnosis {
  goal_id: string;
  status: "no_ritmo" | "atrasada" | "critica" | "no_alvo";
  advice: "acelerar" | "manter" | "ajustar" | "abandonar";
  note: string;
}
export interface FinancialPattern {
  summary: string;
  risk_level: "baixo" | "medio" | "alto";
  top_waste: { label: string; amount: number; suggestion: string }[];
  cut_target: string;
}
export interface Consistency {
  trend: "subindo" | "estavel" | "caindo";
  note: string;
  routine_tip: string;
}
export interface StrategicAdvice {
  cuts: Cut[];
  critical_alerts: CriticalAlert[];
  goals_diagnosis: GoalDiagnosis[];
  financial_pattern: FinancialPattern;
  consistency: Consistency;
}

/** Histórico de conclusão dos últimos 14 dias para detecção de consistência. */
function buildCompletionHistory(tasks: any[]): { date: string; total: number; done: number }[] {
  const today = todayISO();
  const out: { date: string; total: number; done: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDaysISO(today, -i);
    const dayTasks = tasks.filter((t) => t.due_date === d);
    out.push({
      date: d,
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.status === "concluida").length,
    });
  }
  return out;
}

/** Busca o aconselhamento estratégico do dia. Cache 30min. */
export function useStrategicAdvice() {
  const { scope } = useScope();
  const today = todayISO();

  const { data: tasksAll = [] } = useTasks();
  const { data: txnsAll = [] } = useTransactions();
  const { data: accountsAll = [] } = useAccounts();
  const { data: eventsAll = [] } = useEvents(today, today);
  const goalsAll = useAllGoalsProgress();

  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);
  const txns = useMemo(() => filterByScope(txnsAll, scope), [txnsAll, scope]);
  const accounts = useMemo(() => filterByScope(accountsAll, scope), [accountsAll, scope]);
  const events = useMemo(() => filterByScope(eventsAll, scope), [eventsAll, scope]);
  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);

  const balances = useMemo(() => balancesByScope(accounts as any, txns as any), [accounts, txns]);
  const monthFlow = useMemo(
    () => cashFlow(txns as any, startOfMonthISO(), endOfMonthISO()),
    [txns],
  );
  const completionHistory = useMemo(() => buildCompletionHistory(tasks), [tasks]);

  // Top categorias de gasto do mês
  const topCategories = useMemo(() => {
    const monthStart = startOfMonthISO();
    const monthEnd = endOfMonthISO();
    const map: Record<string, number> = {};
    for (const t of txns as any[]) {
      if (t.type !== "saida" || t.status !== "pago") continue;
      if (t.date < monthStart || t.date > monthEnd) continue;
      const key = t.description || t.category_id || "outros";
      map[key] = (map[key] ?? 0) + Number(t.amount);
    }
    return Object.entries(map)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [txns]);

  const hasContext =
    tasks.length > 0 || goals.length > 0 || (txns as any[]).length > 0;

  const queryKey = [
    "strategic-advice",
    today,
    scope,
    tasks.length,
    goals.length,
    (txns as any[]).length,
  ];

  const query = useQuery({
    queryKey,
    enabled: hasContext,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("strategic-advisor", {
        body: {
          date: today,
          scope,
          tasks: tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            priority: t.priority,
            status: t.status,
            scope: t.scope,
            goal_id: t.goal_id,
          })),
          goals: goals.map((g: any) => ({
            id: g.id,
            name: g.name,
            scope: g.scope,
            deadline: g.deadline,
            pct: g.progress?.pct,
            pace: g.progress?.pace,
          })),
          finance: {
            balances,
            month: monthFlow,
            top_expenses: topCategories,
          },
          completion_history: completionHistory,
          events,
          habits: [],
        },
      });
      if (error) throw error;
      return data as { advice: StrategicAdvice; generated_at: string };
    },
  });

  const qc = useQueryClient();
  const regenerate = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: ["strategic-advice"] });
      return query.refetch();
    },
  });

  return { ...query, regenerate };
}

/** Decisão rápida — chamada do botão "O que devo fazer agora?" */
export function useQuickDecision() {
  const { scope } = useScope();
  const { data: tasksAll = [] } = useTasks();
  const { data: accountsAll = [] } = useAccounts();
  const { data: txnsAll = [] } = useTransactions();
  const goalsAll = useAllGoalsProgress();

  return useMutation({
    mutationFn: async () => {
      const tasks = filterByScope(tasksAll, scope).filter((t: any) => t.status !== "concluida");
      const goals = filterByScope(goalsAll, scope);
      const accounts = filterByScope(accountsAll, scope);
      const txns = filterByScope(txnsAll, scope);
      const balance = balancesByScope(accounts as any, txns as any);

      const { data, error } = await supabase.functions.invoke("quick-decision", {
        body: {
          scope,
          tasks: tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            priority: t.priority,
            status: t.status,
          })),
          goals: goals.map((g: any) => ({
            id: g.id,
            name: g.name,
            pct: g.progress?.pct,
            pace: g.progress?.pace,
          })),
          balance,
        },
      });
      if (error) throw error;
      return (data as any).decision as {
        priority: string;
        immediate_action: string;
        sequence: string[];
        mistake_to_fix: string;
        blind_spot: string;
        critical_decision: string;
        boss_question: string;
      };
    },
  });
}
