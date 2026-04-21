import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBadge } from "@/components/ScopeBadge";
import { GoalFormDrawer } from "@/components/forms/GoalFormDrawer";
import { useGoals, useTasks, useMilestones, useUpsertTask } from "@/hooks/useData";
import { useAllGoalsProgress } from "@/hooks/useGoalProgress";
import { useRedistributeGoal, applyRedistribution, type RedistributionResult } from "@/hooks/useGoalPlanner";
import { formatDateBR, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Target,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Edit2,
  Loader2,
  TrendingUp,
  Clock,
} from "lucide-react";

const paceStyle: Record<string, string> = {
  ok: "text-success border-success/40 bg-success/5",
  no_alvo: "text-success border-success/40 bg-success/5",
  atrasada: "text-warning border-warning/40 bg-warning/5",
  critica: "text-destructive border-destructive/40 bg-destructive/5",
  concluida: "text-muted-foreground border-border bg-muted/30",
};

const paceLabel: Record<string, string> = {
  ok: "No ritmo",
  no_alvo: "No alvo",
  atrasada: "Atrasada",
  critica: "Crítica",
  concluida: "Concluída",
};

export default function MetaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = todayISO();

  const goalsProgress = useAllGoalsProgress();
  const goal = useMemo(() => goalsProgress.find((g) => g.id === id), [goalsProgress, id]);

  const { data: allTasks = [] } = useTasks();
  const { data: milestones = [] } = useMilestones(id);
  const upsertTask = useUpsertTask();
  const redistribute = useRedistributeGoal();

  const [editing, setEditing] = useState(false);
  const [redistResult, setRedistResult] = useState<RedistributionResult | null>(null);

  const goalTasks = useMemo(
    () => (allTasks as any[]).filter((t) => t.goal_id === id),
    [allTasks, id],
  );

  const pendingTasks = goalTasks.filter((t) => t.status !== "concluida");
  const overdue = pendingTasks.filter((t) => t.due_date && t.due_date < today);
  const next7 = pendingTasks
    .filter((t) => t.due_date && t.due_date >= today)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 7);

  if (!goal) {
    return (
      <AppLayout title="Meta">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Meta não encontrada.</p>
          <Button onClick={() => navigate("/metas")}>Voltar</Button>
        </Card>
      </AppLayout>
    );
  }

  const pace = goal.progress.pace;
  const isCritical = pace === "atrasada" && goal.progress.paceDelta < -25;
  const displayPace = isCritical ? "critica" : pace;
  const isLate = pace === "atrasada";

  const toggleTask = (t: any) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsertTask.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
    });
  };

  const runRedistribute = async () => {
    try {
      const r = await redistribute.mutateAsync({
        goal,
        pending_tasks: pendingTasks,
      });
      setRedistResult(r);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao redistribuir");
    }
  };

  const applyRedist = async () => {
    if (!redistResult || !id) return;
    try {
      await applyRedistribution(id, redistResult);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Plano ajustado");
      setRedistResult(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <AppLayout
      title={goal.name}
      subtitle={goal.deadline ? `Prazo: ${formatDateBR(goal.deadline)}` : "Sem prazo definido"}
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/metas")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Metas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      }
    >
      {/* HERO: progresso + diagnóstico */}
      <Card className="p-6 mb-6 shadow-elevated gradient-card">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ScopeBadge scope={goal.scope} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{goal.kind}</span>
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${paceStyle[displayPace] ?? ""} font-medium`}
          >
            {paceLabel[displayPace] ?? displayPace}
          </span>
        </div>
        <div className="flex items-end gap-4 mb-3">
          <div className="font-display text-5xl font-semibold tabular-nums">{goal.progress.pct}%</div>
          <div className="flex-1 pb-2">
            <Progress value={goal.progress.pct} className="h-3 mb-1.5" />
            {goal.progress.detail && (
              <p className="text-xs text-muted-foreground tabular-nums">{goal.progress.detail}</p>
            )}
          </div>
        </div>
        {goal.progress.pace === "atrasada" && goal.progress.paceDelta < 0 && (
          <p className="text-sm text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Você está {Math.abs(Math.round(goal.progress.paceDelta))}% abaixo do ritmo esperado.
          </p>
        )}
      </Card>

      {/* COBRANÇA ATIVA */}
      {(isLate || overdue.length > 0) && (
        <Card className="p-5 mb-6 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-display font-semibold text-sm mb-1">
                {isCritical
                  ? "Risco crítico de não bater o prazo"
                  : overdue.length > 0
                    ? `${overdue.length} ${overdue.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`
                    : "Você está atrás do plano"}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {isCritical
                  ? "Continuar assim significa não atingir a meta. Redistribua ou reduza escopo agora."
                  : "A IA pode reorganizar suas tarefas pendentes ou ajustar o prazo automaticamente."}
              </p>
              {redistResult ? (
                <div className="space-y-2">
                  <div className="p-3 rounded bg-background/60 text-xs">
                    <div className="font-medium mb-1">Diagnóstico: {paceLabel[redistResult.diagnosis] ?? redistResult.diagnosis}</div>
                    <p className="text-muted-foreground">{redistResult.summary}</p>
                    {redistResult.new_deadline && (
                      <p className="mt-1.5">→ Novo prazo sugerido: <strong>{formatDateBR(redistResult.new_deadline)}</strong></p>
                    )}
                    {redistResult.reschedule.length > 0 && (
                      <p className="mt-1">→ {redistResult.reschedule.length} tarefas serão reagendadas</p>
                    )}
                    {redistResult.drop_tasks.length > 0 && (
                      <p className="mt-1 text-destructive">→ {redistResult.drop_tasks.length} tarefas serão removidas (corte de escopo)</p>
                    )}
                    <p className="mt-2 italic">Ação imediata: {redistResult.next_action}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setRedistResult(null)}>Cancelar</Button>
                    <Button size="sm" onClick={applyRedist}>Aplicar ajuste</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={runRedistribute} disabled={redistribute.isPending}>
                  {redistribute.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> IA analisando...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1" /> Redistribuir com IA</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* RITMO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBlock label="Total" value={String(goalTasks.length)} icon={<Target className="h-3.5 w-3.5" />} />
        <StatBlock label="Concluídas" value={String(goalTasks.filter((t) => t.status === "concluida").length)} icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />} />
        <StatBlock label="Pendentes" value={String(pendingTasks.length)} icon={<Circle className="h-3.5 w-3.5" />} />
        <StatBlock label="Atrasadas" value={String(overdue.length)} icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} highlight={overdue.length > 0} />
      </div>

      {/* MICRO-OBJETIVOS (MILESTONES) */}
      <Card className="p-5 mb-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" /> Etapas
        </h3>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma etapa ainda. Edite a meta e gere o plano com IA.
          </p>
        ) : (
          <div className="space-y-3">
            {milestones.map((ms: any, idx: number) => {
              const msTasks = goalTasks.filter((t) => t.milestone_id === ms.id);
              const done = msTasks.length > 0 && msTasks.every((t) => t.status === "concluida");
              const pct = msTasks.length === 0
                ? (ms.done ? 100 : 0)
                : Math.round((msTasks.filter((t) => t.status === "concluida").length / msTasks.length) * 100);
              return (
                <div key={ms.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-display text-accent text-sm tabular-nums">{idx + 1}.</span>
                      <span className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                        {ms.name}
                      </span>
                    </div>
                    {ms.deadline && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDateBR(ms.deadline)}
                      </span>
                    )}
                  </div>
                  {msTasks.length > 0 && (
                    <>
                      <Progress value={pct} className="h-1.5 mb-2" />
                      <ul className="space-y-1">
                        {msTasks.map((t) => (
                          <li key={t.id} className="flex items-center gap-2 text-xs">
                            <button onClick={() => toggleTask(t)}>
                              {t.status === "concluida" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <span className={`flex-1 ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                              {t.title}
                            </span>
                            {t.due_date && (
                              <span className={`text-[10px] tabular-nums ${t.due_date < today && t.status !== "concluida" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                {formatDateBR(t.due_date)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* PRÓXIMOS PASSOS */}
      <Card className="p-5 mb-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" /> Próximos passos
        </h3>
        {next7.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem tarefas pendentes futuras. Bom momento para revisar a meta.
          </p>
        ) : (
          <ul className="space-y-2">
            {next7.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                <button onClick={() => toggleTask(t)}>
                  <Circle className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className="flex-1">{t.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatDateBR(t.due_date!)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {goal && (
        <GoalFormDrawer
          open={editing}
          onOpenChange={setEditing}
          goal={goal}
        />
      )}
    </AppLayout>
  );
}

function StatBlock({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-3 ${highlight ? "border-destructive/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
