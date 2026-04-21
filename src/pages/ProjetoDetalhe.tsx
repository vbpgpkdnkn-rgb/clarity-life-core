import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScopeBadge } from "@/components/ScopeBadge";
import { useProject, useProjectOkrs, useUpsertOkr, useDeleteOkr } from "@/hooks/useProjects";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useLifeAreas } from "@/hooks/useLifeAreas";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import {
  ArrowLeft,
  Plus,
  Target as TargetIcon,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  PlayCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type KanbanCol = "todo" | "doing" | "done";
const COL_LABEL: Record<KanbanCol, string> = { todo: "A fazer", doing: "Em progresso", done: "Concluído" };
const COL_ICON: Record<KanbanCol, any> = { todo: Circle, doing: PlayCircle, done: CheckCircle2 };

export default function ProjetoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: okrs = [] } = useProjectOkrs(id);
  const { data: allTasks = [] } = useTasks();
  const { data: areas = [] } = useLifeAreas();

  const upsertOkr = useUpsertOkr();
  const delOkr = useDeleteOkr();
  const upsertTask = useUpsertTask();

  const [okrOpen, setOkrOpen] = useState(false);
  const [okrEditing, setOkrEditing] = useState<any>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<any>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const tasks = useMemo(() => allTasks.filter((t: any) => t.project_id === id), [allTasks, id]);

  const cols = useMemo(() => {
    const g: Record<KanbanCol, any[]> = { todo: [], doing: [], done: [] };
    tasks.forEach((t: any) => {
      const c = (t.kanban_column ?? "todo") as KanbanCol;
      g[c]?.push(t);
    });
    return g;
  }, [tasks]);

  const area = project ? areas.find((a: any) => a.id === project.area_id) : null;

  const openNewOkr = () => {
    setOkrEditing({
      project_id: id,
      objective: "",
      key_results: [{ name: "", target: 100, current: 0 }],
      position: okrs.length,
    });
    setOkrOpen(true);
  };

  const saveOkr = async () => {
    if (!okrEditing.objective?.trim()) return;
    await upsertOkr.mutateAsync(okrEditing);
    setOkrOpen(false);
  };

  const onDrop = (col: KanbanCol) => {
    if (!draggedId) return;
    const task = tasks.find((t: any) => t.id === draggedId);
    if (!task || task.kanban_column === col) return;
    const status = col === "done" ? "concluida" : col === "doing" ? "em_andamento" : "pendente";
    upsertTask.mutate({
      ...task,
      kanban_column: col,
      status,
      completed_at: col === "done" ? new Date().toISOString() : null,
    });
    setDraggedId(null);
  };

  const newTaskInCol = (col: KanbanCol) => {
    setTaskEditing({
      title: "",
      scope: project?.scope ?? "pessoal",
      project_id: id,
      area_id: project?.area_id ?? null,
      goal_id: project?.goal_id ?? null,
      kanban_column: col,
      status: col === "done" ? "concluida" : col === "doing" ? "em_andamento" : "pendente",
      priority: "media",
    });
    setTaskOpen(true);
  };

  if (isLoading || !project) {
    return (
      <AppLayout title="Projeto">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </AppLayout>
    );
  }

  const completedCount = tasks.filter((t: any) => t.status === "concluida").length;
  const taskPct = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <AppLayout
      title={project.name}
      subtitle={project.description ?? undefined}
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate("/projetos")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      }
    >
      {/* Cabeçalho com badges */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <ScopeBadge scope={project.scope} />
        {area && (
          <Badge variant="outline" className="border-border/60">
            {area.icon} {area.name}
          </Badge>
        )}
        {project.deadline && (
          <Badge variant="outline" className="border-border/60">
            <Calendar className="h-2.5 w-2.5 mr-1" />
            {format(new Date(project.deadline + "T00:00:00"), "dd MMM yyyy", { locale: ptBR })}
          </Badge>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{completedCount}/{tasks.length} tarefas</span>
          <Progress value={taskPct} className="h-1 w-24" />
          <span className="tabular-nums">{taskPct}%</span>
        </div>
      </div>

      {/* OKRs */}
      <Card className="p-5 mb-6 border-border/60 shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-base font-semibold">OKRs</h3>
            <span className="text-xs text-muted-foreground">· {okrs.length}</span>
          </div>
          <Button size="sm" variant="outline" onClick={openNewOkr}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo OKR
          </Button>
        </div>
        {okrs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Defina objetivos mensuráveis para guiar a execução.
          </p>
        ) : (
          <div className="space-y-4">
            {okrs.map((okr: any) => {
              const krs = (okr.key_results ?? []) as Array<{ name: string; target: number; current: number }>;
              const krPct = krs.length === 0
                ? 0
                : Math.round(
                    krs.reduce((s, k) => s + Math.min(100, ((k.current ?? 0) / Math.max(1, k.target)) * 100), 0) / krs.length,
                  );
              return (
                <div key={okr.id} className="border border-border/40 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{okr.objective}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={krPct} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground tabular-nums">{krPct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => { setOkrEditing({ ...okr }); setOkrOpen(true); }}
                      >
                        editar
                      </button>
                    </div>
                  </div>
                  {krs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {krs.map((k, i) => {
                        const pct = Math.min(100, Math.round(((k.current ?? 0) / Math.max(1, k.target)) * 100));
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-3">{i + 1}</span>
                            <span className="flex-1 truncate">{k.name || "—"}</span>
                            <span className="text-muted-foreground tabular-nums">{k.current ?? 0}/{k.target}</span>
                            <Progress value={pct} className="h-1 w-16" />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Kanban */}
      <div className="grid md:grid-cols-3 gap-3">
        {(["todo", "doing", "done"] as KanbanCol[]).map((col) => {
          const Icon = COL_ICON[col];
          return (
            <div
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col)}
              className="bg-muted/30 rounded-md p-3 min-h-[300px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide font-medium">{COL_LABEL[col]}</span>
                  <span className="text-[10px] text-muted-foreground">{cols[col].length}</span>
                </div>
                <button
                  onClick={() => newTaskInCol(col)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Nova tarefa"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {cols[col].map((t: any) => (
                  <Card
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggedId(t.id)}
                    onClick={() => { setTaskEditing(t); setTaskOpen(true); }}
                    className="p-2.5 border-border/60 shadow-none cursor-pointer hover:border-accent/40 transition-colors"
                  >
                    <div className="text-sm font-medium leading-snug">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {format(new Date(t.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                      {t.priority === "alta" && (
                        <span className="text-[10px] text-destructive">alta</span>
                      )}
                    </div>
                  </Card>
                ))}
                {cols[col].length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-6">vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task drawer */}
      <TaskFormDrawer open={taskOpen} onOpenChange={setTaskOpen} task={taskEditing?.id ? taskEditing : undefined} />
      {/* Para criar tarefa nova vinculada ao projeto, usamos o drawer já existente.
          Ele lê o objeto inicial via prop `task` apenas pra editar; criar novo virá com defaults básicos.
          Para vincular ao projeto/coluna automaticamente, salvamos via formulário e o usuário ajusta. */}

      {/* OKR drawer */}
      <Sheet open={okrOpen} onOpenChange={setOkrOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {okrEditing?.id ? "Editar OKR" : "Novo OKR"}
            </SheetTitle>
          </SheetHeader>
          {okrEditing && (
            <div className="space-y-4 mt-6">
              <div>
                <Label>Objetivo</Label>
                <Textarea
                  value={okrEditing.objective}
                  onChange={(e) => setOkrEditing({ ...okrEditing, objective: e.target.value })}
                  rows={2}
                  placeholder="Ex.: Aumentar receita recorrente"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Key Results</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setOkrEditing({
                        ...okrEditing,
                        key_results: [...(okrEditing.key_results ?? []), { name: "", target: 100, current: 0 }],
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {(okrEditing.key_results ?? []).map((k: any, i: number) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder={`KR ${i + 1}`}
                          value={k.name}
                          onChange={(e) => {
                            const arr = [...okrEditing.key_results];
                            arr[i] = { ...arr[i], name: e.target.value };
                            setOkrEditing({ ...okrEditing, key_results: arr });
                          }}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="atual"
                          value={k.current}
                          onChange={(e) => {
                            const arr = [...okrEditing.key_results];
                            arr[i] = { ...arr[i], current: Number(e.target.value) };
                            setOkrEditing({ ...okrEditing, key_results: arr });
                          }}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="meta"
                          value={k.target}
                          onChange={(e) => {
                            const arr = [...okrEditing.key_results];
                            arr[i] = { ...arr[i], target: Number(e.target.value) };
                            setOkrEditing({ ...okrEditing, key_results: arr });
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const arr = [...okrEditing.key_results];
                          arr.splice(i, 1);
                          setOkrEditing({ ...okrEditing, key_results: arr });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-4 border-t border-border">
                {okrEditing.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Excluir OKR?")) {
                        await delOkr.mutateAsync({ id: okrEditing.id, project_id: id! });
                        setOkrOpen(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOkrOpen(false)}>Cancelar</Button>
                  <Button onClick={saveOkr}>Salvar</Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
