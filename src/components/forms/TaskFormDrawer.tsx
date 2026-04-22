import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useGoals, useUpsertTask, useDeleteTask, useMilestones } from "@/hooks/useData";
import { usePatients } from "@/hooks/usePsicoterapia";
import { todayISO } from "@/lib/format";
import { Trash2, Sparkles, Target, Brain } from "lucide-react";
import { MicButton } from "@/components/MicButton";

type Eisenhower =
  | "urgente_importante"
  | "importante_nao_urgente"
  | "urgente_nao_importante"
  | "nao_urgente_nao_importante";

const EISEN_LABEL: Record<Eisenhower, string> = {
  urgente_importante: "Fazer agora (urgente + importante)",
  importante_nao_urgente: "Planejar (importante)",
  urgente_nao_importante: "Delegar (urgente)",
  nao_urgente_nao_importante: "Eliminar",
};

/** Sugere quadrante automaticamente a partir da prioridade e prazo */
function suggestEisenhower(priority?: string, due_date?: string | null): Eisenhower {
  const today = todayISO();
  const urgent = !!due_date && due_date <= today;
  const important = priority === "alta";
  if (urgent && important) return "urgente_importante";
  if (!urgent && important) return "importante_nao_urgente";
  if (urgent && !important) return "urgente_nao_importante";
  return "nao_urgente_nao_importante";
}

/** Sugere slot 1-3-5 a partir da prioridade */
function suggest135(priority?: string): "1" | "3" | "5" | null {
  if (priority === "alta") return "1";
  if (priority === "media") return "3";
  if (priority === "baixa") return "5";
  return null;
}

export function TaskFormDrawer({
  open,
  onOpenChange,
  task,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: any;
  defaultDate?: string;
}) {
  const [form, setForm] = useState<any>({});
  const { data: categories = [] } = useCategories("task");
  const { data: goals = [] } = useGoals();
  const { data: milestones = [] } = useMilestones(form.goal_id ?? undefined);
  const { data: patients = [] } = usePatients();
  const upsert = useUpsertTask();
  const del = useDeleteTask();

  useEffect(() => {
    if (open) {
      const base = task ?? {
        title: "",
        notes: "",
        scope: "pessoal",
        priority: "media",
        status: "pendente",
        due_date: defaultDate ?? todayISO(),
        category_id: null,
        goal_id: null,
        eisenhower: null,
        is_135: null,
        patient_id: null,
      };
      // Auto-sugere se ainda não definido
      if (!base.eisenhower) base.eisenhower = suggestEisenhower(base.priority, base.due_date);
      if (!base.is_135) base.is_135 = suggest135(base.priority);
      // Quando vem com patient_id pré-selecionado, força escopo profissional
      if (base.patient_id && !task) base.scope = "profissional";
      setForm(base);
    }
  }, [open, task, defaultDate]);

  /** Atualiza prioridade ou data e re-sugere quadrante/slot se usuário não tocou manualmente */
  const updatePriorityOrDate = (patch: Partial<any>) => {
    setForm((prev: any) => {
      const next = { ...prev, ...patch };
      // Re-sugere apenas se o valor atual ainda corresponde à sugestão antiga (não foi customizado)
      const oldSuggestion = suggestEisenhower(prev.priority, prev.due_date);
      if (prev.eisenhower === oldSuggestion) {
        next.eisenhower = suggestEisenhower(next.priority, next.due_date);
      }
      const old135 = suggest135(prev.priority);
      if (prev.is_135 === old135) {
        next.is_135 = suggest135(next.priority);
      }
      return next;
    });
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    const payload = { ...form };
    if (payload.status === "concluida" && !payload.completed_at) {
      payload.completed_at = new Date().toISOString();
    }
    if (payload.status !== "concluida") payload.completed_at = null;
    await upsert.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{task ? "Editar tarefa" : "Nova tarefa"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Título</Label>
            <div className="flex gap-2">
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="O que precisa ser feito?"
                autoFocus
              />
              <MicButton value={form.title || ""} onChange={(v) => setForm({ ...form, title: v })} size="md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Escopo</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => updatePriorityOrDate({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => updatePriorityOrDate({ due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Classificação automática (editável) */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" /> Classificação automática
            </div>
            <div>
              <Label className="text-xs">Matriz Eisenhower</Label>
              <Select
                value={form.eisenhower ?? "nao_urgente_nao_importante"}
                onValueChange={(v) => setForm({ ...form, eisenhower: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EISEN_LABEL) as (keyof typeof EISEN_LABEL)[]).map((k) => (
                    <SelectItem key={k} value={k}>{EISEN_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Regra 1-3-5 (foco do dia)</Label>
              <Select
                value={form.is_135 ?? "none"}
                onValueChange={(v) => setForm({ ...form, is_135: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuir</SelectItem>
                  <SelectItem value="1">1 grande (move o ponteiro)</SelectItem>
                  <SelectItem value="3">3 médias (importantes)</SelectItem>
                  <SelectItem value="5">5 pequenas (manutenção)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Categoria <span className="text-[10px] text-muted-foreground">({form.scope})</span></Label>
            <Select
              value={form.category_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories
                  .filter((c) => c.scope === form.scope)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="h-3 w-3" /> Vínculo com meta
            </div>
            <div>
              <Label className="text-xs">Meta</Label>
              <Select
                value={form.goal_id ?? "none"}
                onValueChange={(v) => {
                  const goalId = v === "none" ? null : v;
                  const linked = goals.find((g: any) => g.id === goalId);
                  setForm({
                    ...form,
                    goal_id: goalId,
                    milestone_id: null, // reseta marco ao trocar de meta
                    // Sincroniza escopo automaticamente com a meta
                    scope: linked?.scope ?? form.scope,
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {goals
                    .filter((g: any) => g.kind !== "financeiro" && g.status !== "concluida")
                    .map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                        <span className="text-[10px] text-muted-foreground ml-1">({g.scope})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {form.goal_id && milestones.length > 0 && (
              <div>
                <Label className="text-xs">Marco / etapa</Label>
                <Select
                  value={form.milestone_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, milestone_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem marco" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem marco específico</SelectItem>
                    {milestones.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.deadline && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (até {new Date(m.deadline + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Brain className="h-3 w-3" /> Paciente (Psicoterapia)
            </div>
            <Select
              value={form.patient_id ?? "none"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  patient_id: v === "none" ? null : v,
                  scope: v !== "none" ? "profissional" : form.scope,
                })
              }
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(patients as any[])
                  .filter((p) => p.status !== "encerrado")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <div className="relative">
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="pr-11"
              />
              <div className="absolute right-1.5 top-1.5">
                <MicButton value={form.notes || ""} onChange={(v) => setForm({ ...form, notes: v })} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={save} className="flex-1">Salvar</Button>
            {task && (
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await del.mutateAsync(task.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
