import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Calendar, Target, Loader2, Check, X, Edit2, AlertCircle, Flag } from "lucide-react";
import { useGenerateGoalPlan, persistExecutionPlan, type ExecutionPlan } from "@/hooks/useGoalPlanner";
import { formatDateBR } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  goal: any;
  goalId?: string;
  onApplied: (newDeadline?: string) => void;
  /** Quando a meta ainda não foi salva, este callback cria a meta e retorna o id. */
  onCreateGoal?: () => Promise<string | undefined>;
}

const complexityColor = {
  baixa: "text-success",
  media: "text-warning",
  alta: "text-destructive",
};

export function GoalPlanPreview({ goal, goalId, onApplied, onCreateGoal }: Props) {
  const generate = useGenerateGoalPlan();
  const qc = useQueryClient();
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [editing, setEditing] = useState<{ msIdx: number; tIdx: number } | null>(null);
  const [applying, setApplying] = useState(false);

  const run = async () => {
    if (!goal?.name?.trim()) {
      toast.error("Defina o nome da meta primeiro");
      return;
    }
    try {
      const result = await generate.mutateAsync({
        goal,
        requested_deadline: goal.deadline,
      });
      setPlan(result);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar plano");
    }
  };

  const apply = async () => {
    if (!plan) return;
    setApplying(true);
    try {
      // Se a meta ainda não foi salva, cria agora
      let id = goalId;
      if (!id) {
        if (!onCreateGoal) throw new Error("Salve a meta primeiro");
        id = await onCreateGoal();
        if (!id) throw new Error("Falha ao criar meta");
      }
      const r = await persistExecutionPlan(id, goal.scope ?? "pessoal", plan);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["milestones", id] });
      qc.invalidateQueries({ queryKey: ["milestones-all"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success(`Plano aplicado: ${r.milestones} etapas, ${r.tasks} tarefas`);
      onApplied(plan.suggested_deadline);
      setPlan(null);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao aplicar plano");
    } finally {
      setApplying(false);
    }
  };

  const updateTask = (msIdx: number, tIdx: number, field: string, value: string) => {
    if (!plan) return;
    const next = { ...plan, milestones: plan.milestones.map((m) => ({ ...m, tasks: m.tasks.map((t) => ({ ...t })) })) };
    (next.milestones[msIdx].tasks[tIdx] as any)[field] = value;
    setPlan(next);
  };

  const removeTask = (msIdx: number, tIdx: number) => {
    if (!plan) return;
    const next = { ...plan, milestones: plan.milestones.map((m) => ({ ...m, tasks: m.tasks.map((t) => ({ ...t })) })) };
    next.milestones[msIdx].tasks.splice(tIdx, 1);
    setPlan(next);
  };

  if (!plan) {
    return (
      <Card data-goal-plan-preview className="p-4 border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <h4 className="font-display font-semibold text-sm mb-1">IA Executiva de Performance</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Gera prazo realista, micro-objetivos e tarefas distribuídas no calendário respeitando sua carga atual.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={run}
              disabled={generate.isPending || !goal?.name?.trim()}
              className="w-full"
            >
              {generate.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando carga e gerando plano...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Gerar plano com IA</>
              )}
            </Button>
            {!goal?.name?.trim() && (
              <p className="text-[10px] text-muted-foreground mt-2">Defina o nome da meta para gerar o plano.</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const totalTasks = plan.milestones.reduce((s, m) => s + m.tasks.length, 0);

  const totalMilestones = plan.milestones.length;
  const status: "pronto" | "aplicando" = applying ? "aplicando" : "pronto";

  return (
    <Card className="p-4 border-accent/40 bg-gradient-to-br from-accent/5 to-transparent">
      {/* Barra de status */}
      <div className="mb-3 rounded-md border border-accent/30 bg-background/60 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            {status === "aplicando" ? (
              <Loader2 className="h-4 w-4 text-accent animate-spin" />
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-semibold">
                {status === "aplicando" ? "Aplicando plano…" : "Plano pronto para revisão"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {status === "aplicando"
                  ? "Criando marcos e tarefas no calendário"
                  : "Revise abaixo antes de aplicar — nada foi salvo ainda"}
              </span>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPlan(null)} disabled={applying}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* Indicadores rápidos */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-background/40">
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <Flag className="h-3 w-3 text-accent" />
            <span className="text-[11px] font-medium tabular-nums">{totalMilestones}</span>
            <span className="text-[10px] text-muted-foreground">marcos</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <Target className="h-3 w-3 text-accent" />
            <span className="text-[11px] font-medium tabular-nums">{totalTasks}</span>
            <span className="text-[10px] text-muted-foreground">tarefas</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <Calendar className="h-3 w-3 text-accent" />
            <span className="text-[11px] font-medium tabular-nums">{formatDateBR(plan.suggested_deadline)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h4 className="font-display font-semibold text-sm">Plano gerado pela IA</h4>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 rounded bg-background/60">
          <div className="text-[10px] uppercase text-muted-foreground">Prazo</div>
          <div className="text-xs font-semibold tabular-nums flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateBR(plan.suggested_deadline)}
          </div>
        </div>
        <div className="p-2 rounded bg-background/60">
          <div className="text-[10px] uppercase text-muted-foreground">Complexidade</div>
          <div className={`text-xs font-semibold capitalize ${complexityColor[plan.complexity]}`}>
            {plan.complexity}
          </div>
        </div>
        <div className="p-2 rounded bg-background/60">
          <div className="text-[10px] uppercase text-muted-foreground">Tarefas</div>
          <div className="text-xs font-semibold tabular-nums flex items-center justify-center gap-1">
            <Target className="h-3 w-3" />
            {totalTasks}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic mb-3 px-1">
        "{plan.deadline_rationale}"
      </p>

      {/* Milestones */}
      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
        {plan.milestones.map((ms, i) => (
          <div key={i} className="rounded-md border border-border bg-background/40 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-medium text-xs">{i + 1}. {ms.name}</div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                até {formatDateBR(ms.deadline)}
              </span>
            </div>
            <ul className="space-y-1">
              {ms.tasks.map((t, ti) => (
                <li key={ti} className="flex items-center gap-1.5 text-xs group">
                  <span className="h-1 w-1 rounded-full bg-accent shrink-0" />
                  {editing?.msIdx === i && editing?.tIdx === ti ? (
                    <>
                      <Input
                        value={t.title}
                        onChange={(e) => updateTask(i, ti, "title", e.target.value)}
                        className="h-6 text-xs flex-1"
                        autoFocus
                      />
                      <Input
                        type="date"
                        value={t.due_date}
                        onChange={(e) => updateTask(i, ti, "due_date", e.target.value)}
                        className="h-6 text-xs w-32"
                      />
                      <button type="button" onClick={() => setEditing(null)} className="text-success">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDateBR(t.due_date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing({ msIdx: i, tIdx: ti })}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(i, ti)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={run} disabled={generate.isPending || applying}>
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Regerar
        </Button>
        <Button type="button" size="sm" onClick={apply} disabled={applying || totalTasks === 0} className="flex-1">
          {applying ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Aplicando...</>
          ) : (
            <><Check className="h-3.5 w-3.5 mr-1" /> Aplicar plano ({totalTasks} tarefas)</>
          )}
        </Button>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 px-1">
        <AlertCircle className="h-3 w-3" /> Os marcos e tarefas só são criados ao clicar em "Aplicar plano".
      </p>
    </Card>
  );
}
