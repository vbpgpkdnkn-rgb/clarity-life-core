import { useGoals, useTasks, useTransactions } from "./useData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Compute progress for a goal based on its kind:
 * - tarefas: % of linked tasks completed
 * - financeiro: current_value / target_value (current_value auto-summed from linked txns)
 * - marcos: % of milestones done
 */
export function useGoalProgress(goalId: string) {
  const { data: goal } = useQuery({
    queryKey: ["goal-progress", goalId],
    queryFn: async () => {
      const [{ data: g }, { data: tasks }, { data: txns }, { data: ms }] = await Promise.all([
        supabase.from("goals").select("*").eq("id", goalId).single(),
        supabase.from("tasks").select("*").eq("goal_id", goalId),
        supabase.from("transactions").select("*").eq("goal_id", goalId),
        supabase.from("milestones").select("*").eq("goal_id", goalId),
      ]);
      return { goal: g, tasks: tasks ?? [], txns: txns ?? [], milestones: ms ?? [] };
    },
  });
  return goal;
}

export function computeGoalProgress(
  goal: any,
  tasks: any[],
  txns: any[],
  milestones: any[],
): { pct: number; current: number; target: number | null } {
  if (!goal) return { pct: 0, current: 0, target: null };
  if (goal.kind === "tarefas") {
    const linked = tasks.filter((t) => t.goal_id === goal.id);
    if (linked.length === 0) return { pct: 0, current: 0, target: 0 };
    const done = linked.filter((t) => t.status === "concluida").length;
    return { pct: Math.round((done / linked.length) * 100), current: done, target: linked.length };
  }
  if (goal.kind === "financeiro") {
    const linkedTxns = txns.filter((t) => t.goal_id === goal.id);
    const sum = linkedTxns.reduce(
      (acc, t) => acc + (t.type === "entrada" ? Number(t.amount) : -Number(t.amount)),
      0,
    );
    const target = Number(goal.target_value || 0);
    return {
      pct: target > 0 ? Math.min(100, Math.round((sum / target) * 100)) : 0,
      current: sum,
      target,
    };
  }
  if (goal.kind === "marcos") {
    const linked = milestones.filter((m) => m.goal_id === goal.id);
    if (linked.length === 0) return { pct: 0, current: 0, target: 0 };
    const done = linked.filter((m) => m.done).length;
    return { pct: Math.round((done / linked.length) * 100), current: done, target: linked.length };
  }
  return { pct: 0, current: 0, target: null };
}

/** Fetch all dependencies once and compute progress for any goal */
export function useAllGoalsProgress() {
  const { data: goals = [] } = useGoals();
  const { data: tasks = [] } = useTasks();
  const { data: txns = [] } = useTransactions();
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones-all"],
    queryFn: async () => {
      const { data } = await supabase.from("milestones").select("*");
      return data ?? [];
    },
  });

  return goals.map((g) => ({
    ...g,
    progress: computeGoalProgress(g, tasks, txns, milestones),
  }));
}
