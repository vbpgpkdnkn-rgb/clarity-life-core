import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR } from "@/lib/format";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

/**
 * Mostra metas que precisam de atenção HOJE no Foco do Dia,
 * com a próxima ação executável (próxima tarefa pendente da meta).
 */
export function GoalsFocusCard() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const today = todayISO();
  const goalsAll = useAllGoalsProgress();
  const { data: tasksAll = [] } = useTasks();
  const upsertTask = useUpsertTask();

  const goals = useMemo(() => filterByScope(goalsAll, scope), [goalsAll, scope]);
  const tasks = useMemo(() => filterByScope(tasksAll, scope), [tasksAll, scope]);

  /** Metas ativas com prioridade: atrasadas → no ritmo com prazo próximo → demais ativas */
  const focusGoals = useMemo(() => {
    return goals
      .filter((g: any) => g.status === "ativa" && g.progress.pct < 100)
      .map((g: any) => {
        const goalTasks = (tasks as any[]).filter((t) => t.goal_id === g.id);
        const pending = goalTasks.filter((t) => t.status !== "concluida");
        const overdue = pending.filter((t) => t.due_date && t.due_date < today);
        const nextTask = pending
          .filter((t) => t.due_date)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
        const daysToDeadline = g.deadline
          ? Math.round(
              (new Date(g.deadline).getTime() - new Date(today).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;
        return { ...g, nextTask, overdue: overdue.length, daysToDeadline, totalPending: pending.length };
      })
      .sort((a, b) => {
        // 1. Atrasadas primeiro
        const aLate = a.progress.pace === "atrasada" ? 0 : 1;
        const bLate = b.progress.pace === "atrasada" ? 0 : 1;
        if (aLate !== bLate) return aLate - bLate;
        // 2. Mais overdue
        if (a.overdue !== b.overdue) return b.overdue - a.overdue;
        // 3. Prazo mais próximo
        const aDl = a.daysToDeadline ?? 9999;
        const bDl = b.daysToDeadline ?? 9999;
        return aDl - bDl;
      })
      .slice(0, 3);
  }, [goals, tasks, today]);

  const completeTask = (t: any) => {
    upsertTask.mutate({
      ...t,
      status: "concluida",
      completed_at: new Date().toISOString(),
    });
  };

  if (focusGoals.length === 0) return null;

  return (
    <Card className="p-5 mb-4 border-border/60 shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">Metas no radar</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/metas")}>
          Ver todas <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      <div className="space-y-3">
        {focusGoals.map((g: any) => {
          const isLate = g.progress.pace === "atrasada";
          const isCritical = isLate && g.progress.paceDelta < -25;
          return (
            <div
              key={g.id}
              className={`rounded-lg border p-3 transition-colors ${
                isCritical
                  ? "border-destructive/40 bg-destructive/5"
                  : isLate
                    ? "border-warning/40 bg-warning/5"
                    : "border-border bg-muted/20"
              }`}
            >
              <button
                onClick={() => navigate(`/metas/${g.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <ScopeBadge scope={g.scope} />
                  <span className="text-sm font-medium truncate flex-1">{g.name}</span>
                  {isCritical ? (
                    <span className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" /> Crítica
                    </span>
                  ) : isLate ? (
                    <span className="flex items-center gap-1 text-[10px] text-warning font-medium">
                      <AlertTriangle className="h-3 w-3" /> Atrasada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                      <TrendingUp className="h-3 w-3" /> No ritmo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={g.progress.pct} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold tabular-nums w-9 text-right">
                    {g.progress.pct}%
                  </span>
                </div>
                {g.deadline && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    Prazo: {formatDateBR(g.deadline)}
                    {g.daysToDeadline !== null && g.daysToDeadline >= 0 && (
                      <> · {g.daysToDeadline} dia{g.daysToDeadline === 1 ? "" : "s"}</>
                    )}
                    {g.overdue > 0 && (
                      <span className="text-destructive ml-1">· {g.overdue} atrasada{g.overdue === 1 ? "" : "s"}</span>
                    )}
                  </p>
                )}
              </button>

              {/* Próxima ação */}
              {g.nextTask && (
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                  <button
                    onClick={() => completeTask(g.nextTask)}
                    title="Concluir esta tarefa"
                    className="shrink-0 hover:scale-110 transition-transform"
                  >
                    {g.nextTask.status === "concluida" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-accent" />
                    )}
                  </button>
                  <span className="text-xs flex-1 truncate">
                    <span className="text-muted-foreground">Próxima: </span>
                    {g.nextTask.title}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums shrink-0 ${
                      g.nextTask.due_date < today ? "text-destructive font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {formatDateBR(g.nextTask.due_date)}
                  </span>
                </div>
              )}
              {!g.nextTask && g.totalPending === 0 && (
                <p className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground italic">
                  Sem tarefas pendentes — abra a meta para criar próximos passos.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
