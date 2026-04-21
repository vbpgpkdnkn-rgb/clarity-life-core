import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from "./useData";
import { useEvents } from "./usePlanner";
import { todayISO, addDaysISO } from "@/lib/format";
import { useMemo } from "react";

export interface PlanTask {
  title: string;
  due_date: string;
  priority: "alta" | "media" | "baixa";
}
export interface PlanMilestone {
  name: string;
  deadline: string;
  tasks: PlanTask[];
}
export interface ExecutionPlan {
  suggested_deadline: string;
  deadline_rationale: string;
  complexity: "baixa" | "media" | "alta";
  weekly_capacity: number;
  milestones: PlanMilestone[];
}

export interface RedistributionResult {
  diagnosis: "no_ritmo" | "atrasada" | "critica";
  summary: string;
  new_deadline?: string;
  drop_tasks: string[];
  reschedule: { task_id: string; new_due_date: string; reason?: string }[];
  next_action: string;
}

/** Mapa de carga: { "YYYY-MM-DD": numTarefasPendentes } nos próximos 90 dias */
export function useLoadByDay(): Record<string, number> {
  const { data: tasks = [] } = useTasks();
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks as any[]) {
      if (!t.due_date || t.status === "concluida") continue;
      map[t.due_date] = (map[t.due_date] ?? 0) + 1;
    }
    return map;
  }, [tasks]);
}

/** Gera plano executivo via IA */
export function useGenerateGoalPlan() {
  const loadByDay = useLoadByDay();
  const today = todayISO();
  const { data: events = [] } = useEvents(today, addDaysISO(today, 90));

  return useMutation({
    mutationFn: async (input: {
      goal: any;
      requested_deadline?: string | null;
    }): Promise<ExecutionPlan> => {
      const busyDays = Array.from(
        new Set(
          (events as any[])
            .filter((e) => !e.all_day && e.start_time)
            .map((e) => e.date),
        ),
      );

      const { data, error } = await supabase.functions.invoke("goal-planner", {
        body: {
          goal: input.goal,
          today,
          load_by_day: loadByDay,
          busy_days: busyDays,
          requested_deadline: input.requested_deadline,
          user_history: {},
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).plan as ExecutionPlan;
    },
  });
}

/** Persiste o plano: cria milestones e tasks vinculadas */
export async function persistExecutionPlan(
  goalId: string,
  scope: string,
  plan: ExecutionPlan,
): Promise<{ milestones: number; tasks: number }> {
  let mCount = 0;
  let tCount = 0;
  for (let i = 0; i < plan.milestones.length; i++) {
    const ms = plan.milestones[i];
    const { data: msRow, error: msErr } = await supabase
      .from("milestones")
      .insert({
        goal_id: goalId,
        name: ms.name,
        deadline: ms.deadline || null,
        position: i,
      })
      .select()
      .single();
    if (msErr) throw msErr;
    mCount++;

    const tasksPayload = ms.tasks.map((t) => ({
      title: t.title,
      due_date: t.due_date,
      priority: t.priority,
      scope: scope as "pessoal" | "profissional",
      goal_id: goalId,
      milestone_id: msRow.id,
      status: "pendente" as const,
    }));
    if (tasksPayload.length > 0) {
      const { error: tErr } = await supabase.from("tasks").insert(tasksPayload);
      if (tErr) throw tErr;
      tCount += tasksPayload.length;
    }
  }
  return { milestones: mCount, tasks: tCount };
}

/** Redistribui tarefas pendentes de uma meta */
export function useRedistributeGoal() {
  const loadByDay = useLoadByDay();
  const today = todayISO();

  return useMutation({
    mutationFn: async (input: {
      goal: any;
      pending_tasks: any[];
    }): Promise<RedistributionResult> => {
      const { data, error } = await supabase.functions.invoke("goal-redistribute", {
        body: {
          goal: input.goal,
          pending_tasks: input.pending_tasks.map((t) => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            priority: t.priority,
          })),
          today,
          load_by_day: loadByDay,
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      return (data as any).result as RedistributionResult;
    },
  });
}

/** Aplica resultado da redistribuição no banco */
export async function applyRedistribution(
  goalId: string,
  result: RedistributionResult,
): Promise<void> {
  if (result.drop_tasks?.length) {
    await supabase.from("tasks").delete().in("id", result.drop_tasks);
  }
  for (const r of result.reschedule || []) {
    await supabase
      .from("tasks")
      .update({ due_date: r.new_due_date })
      .eq("id", r.task_id);
  }
  if (result.new_deadline) {
    await supabase
      .from("goals")
      .update({ deadline: result.new_deadline })
      .eq("id", goalId);
  }
}
