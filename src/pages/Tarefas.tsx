import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useScope, filterByScope, defaultScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR, addDaysISO, startOfWeekISO, endOfWeekISO } from "@/lib/format";
import { Plus, CheckCircle2, Circle, CircleDot, Calendar } from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  alta: "bg-destructive",
  media: "bg-warning",
  baixa: "bg-muted-foreground/40",
};

export default function Planner() {
  const { data: tasks = [] } = useTasks();
  const upsert = useUpsertTask();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<string>(todayISO());
  const [filter, setFilter] = useState<"todos" | "pessoal" | "profissional">("todos");
  const [quickInput, setQuickInput] = useState("");

  const today = todayISO();
  const weekEnd = endOfWeekISO();

  const filtered = useMemo(
    () => tasks.filter((t) => filter === "todos" || t.scope === filter),
    [tasks, filter],
  );

  const groups = useMemo(() => {
    const byDate: Record<string, any[]> = { atrasadas: [], hoje: [], semana: [], futuro: [], semData: [] };
    for (const t of filtered) {
      if (!t.due_date) byDate.semData.push(t);
      else if (t.status !== "concluida" && t.due_date < today) byDate.atrasadas.push(t);
      else if (t.due_date === today) byDate.hoje.push(t);
      else if (t.due_date > today && t.due_date <= weekEnd) byDate.semana.push(t);
      else byDate.futuro.push(t);
    }
    return byDate;
  }, [filtered, today, weekEnd]);

  const toggle = (t: any) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsert.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
    });
  };

  const cycleStatus = (t: any) => {
    const order = ["pendente", "em_andamento", "concluida"];
    const next = order[(order.indexOf(t.status) + 1) % 3];
    upsert.mutate({
      ...t,
      status: next,
      completed_at: next === "concluida" ? new Date().toISOString() : null,
    });
  };

  const quickAdd = () => {
    if (!quickInput.trim()) return;
    upsert.mutate({
      title: quickInput.trim(),
      scope: defaultScope(scope),
      priority: "media",
      status: "pendente",
      due_date: today,
    });
    setQuickInput("");
  };

  const reschedule = (t: any, days: number) => {
    const base = t.due_date || today;
    upsert.mutate({ ...t, due_date: addDaysISO(base, days) });
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setDrawerOpen(true);
  };

  const openNew = (date?: string) => {
    setEditing(null);
    setDefaultDate(date ?? today);
    setDrawerOpen(true);
  };

  return (
    <AppLayout
      title="Planner"
      subtitle="Tarefas do dia e da semana"
      action={
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-1" /> Tarefa
        </Button>
      }
    >
      {/* Filtro global de escopo está no header */}

      {/* Quick add */}
      <Card className="p-3 mb-6 shadow-soft flex gap-2">
        <Input
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAdd()}
          placeholder="Adicionar rápido (Enter para salvar)"
          className="border-0 shadow-none focus-visible:ring-0"
        />
        <Button onClick={quickAdd} size="sm" disabled={!quickInput.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </Card>

      <div className="space-y-6">
        <Section title="Atrasadas" tasks={groups.atrasadas} onToggle={toggle} onCycle={cycleStatus} onEdit={openEdit} onReschedule={reschedule} variant="warning" />
        <Section title="Hoje" tasks={groups.hoje} onToggle={toggle} onCycle={cycleStatus} onEdit={openEdit} onReschedule={reschedule} onAdd={() => openNew(today)} />
        <Section title="Esta semana" tasks={groups.semana} onToggle={toggle} onCycle={cycleStatus} onEdit={openEdit} onReschedule={reschedule} />
        <Section title="Futuro" tasks={groups.futuro} onToggle={toggle} onCycle={cycleStatus} onEdit={openEdit} onReschedule={reschedule} />
        {groups.semData.length > 0 && (
          <Section title="Sem data" tasks={groups.semData} onToggle={toggle} onCycle={cycleStatus} onEdit={openEdit} onReschedule={reschedule} />
        )}
      </div>

      <TaskFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} task={editing} defaultDate={defaultDate} />
    </AppLayout>
  );
}

function Section({
  title,
  tasks,
  onToggle,
  onCycle,
  onEdit,
  onReschedule,
  onAdd,
  variant,
}: {
  title: string;
  tasks: any[];
  onToggle: (t: any) => void;
  onCycle: (t: any) => void;
  onEdit: (t: any) => void;
  onReschedule: (t: any, days: number) => void;
  onAdd?: () => void;
  variant?: "warning";
}) {
  if (tasks.length === 0 && !onAdd) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-display text-lg font-semibold ${variant === "warning" ? "text-warning" : ""}`}>{title}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <Card className="divide-y divide-border shadow-soft overflow-hidden">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
            <button onClick={() => onToggle(t)} className="shrink-0" title="Concluir">
              {t.status === "concluida" ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : t.status === "em_andamento" ? (
                <CircleDot className="h-5 w-5 text-warning" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              )}
            </button>
            <button onClick={() => onCycle(t)} title="Mudar status">
              <span className={`block h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
            </button>
            <button
              onClick={() => onEdit(t)}
              className={`text-left text-sm flex-1 truncate ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}
            >
              {t.title}
            </button>
            <ScopeBadge scope={t.scope} />
            {t.due_date && (
              <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                {formatDateBR(t.due_date)}
              </span>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => onReschedule(t, 1)}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="+1 dia"
              >
                +1d
              </button>
              <button
                onClick={() => onReschedule(t, 7)}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="+1 semana"
              >
                +7d
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && onAdd && (
          <button onClick={onAdd} className="w-full px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar tarefa para hoje
          </button>
        )}
      </Card>
    </section>
  );
}
