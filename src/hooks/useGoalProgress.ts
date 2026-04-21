import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoals, useTasks, useTransactions } from "./useData";
import { computeGoalProgress, type GoalProgress } from "@/lib/finance";

export { computeGoalProgress, type GoalProgress };

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
    progress: computeGoalProgress(g as any, tasks as any, txns as any, milestones as any),
  }));
}
