import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { InputWithMic } from "@/components/ui/input-with-mic";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useGoals, useUpsertTask, useDeleteTask, useMilestones } from "@/hooks/useData";
import { usePatients } from "@/hooks/usePsicoterapia";
import { todayISO } from "@/lib/format";
import { Trash2, Target, Brain, Zap, BookMarked, Clock, CornerDownLeft, ChevronDown } from "lucide-react";
import { MicButton } from "@/components/MicButton";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const QUADRANT_OPTIONS: { value: Eisenhower; title: string; subtitle: string; icon: any; activeClass: string }[] = [
  { value: "urgente_importante", title: "Gera retorno", subtitle: "Fazer agora", icon: Zap, activeClass: "bg-destructive/15 border-destructive text-destructive" },
  { value: "importante_nao_urgente", title: "Precisa de tempo", subtitle: "Agendar um bloco", icon: BookMarked, activeClass: "bg-primary/15 border-primary text-primary" },
  { value: "urgente_nao_importante", title: "Precisa ser feito", subtitle: "Encaixar no dia", icon: Clock, activeClass: "bg-warning/15 border-warning text-warning" },
  { value: "nao_urgente_nao_importante", title: "Pode esperar", subtitle: "Remanejar ou delegar", icon: CornerDownLeft, activeClass: "bg-muted border-muted-foreground/40 text-muted-foreground" },
];

const QUADRANT_TO_PRIORITY: Record<Eisenhower, string> = {
  urgente_importante: "alta",
  importante_nao_urgente: "alta",
  urgente_nao_importante: "media",
  nao_urgente_nao_importante: "baixa",
};

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
      // Quando vem com patient_id pré-selecionado, força escopo profissional
      if (base.patient_id && !task) base.scope = "profissional";
      setForm(base);
    }
  }, [open, task, defaultDate]);

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
            <Label className="mb-2 block">O que é essa tarefa?</Label>
            <div className="grid grid-cols-2 gap-2">
              {QUADRANT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = form.eisenhower === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        eisenhower: opt.value,
                        priority: QUADRANT_TO_PRIORITY[opt.value],
                      })
                    }
                    className={cn(
                      "rounded-xl border-2 p-3 cursor-pointer transition-all text-left w-full",
                      active ? opt.activeClass : "bg-muted/30 border-border text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-4 w-4 mb-1.5" />
                    <div className="font-semibold text-sm leading-tight">{opt.title}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">{opt.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <InputWithMic
              value={form.title || ""}
              onValueChange={(v) => setForm({ ...form, title: v })}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
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

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40">
              <span className="flex items-center gap-1.5"><Target className="h-3 w-3" /> Vínculo com meta</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 rounded-md border border-t-0 border-border bg-muted/10 p-3">
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
                      milestone_id: null,
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
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40">
              <span className="flex items-center gap-1.5"><Brain className="h-3 w-3" /> Paciente</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="rounded-md border border-t-0 border-border bg-muted/10 p-3">
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
            </CollapsibleContent>
          </Collapsible>

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
