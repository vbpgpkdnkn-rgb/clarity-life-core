import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScopeBadge } from "@/components/ScopeBadge";
import { TaskFormDrawer } from "@/components/forms/TaskFormDrawer";
import { useTasks, useUpsertTask } from "@/hooks/useData";
import { useScope, filterByScope, defaultScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR, addDaysISO, endOfWeekISO } from "@/lib/format";
import { Plus, AlertCircle, Calendar, Target, GripVertical } from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  alta: "bg-destructive",
  media: "bg-warning",
  baixa: "bg-muted-foreground/40",
};

type Status = "pendente" | "em_andamento" | "concluida";

const COLUMNS: { key: Status; title: string; tone: string }[] = [
  { key: "pendente", title: "A fazer", tone: "border-t-muted-foreground/40" },
  { key: "em_andamento", title: "Em andamento", tone: "border-t-warning" },
  { key: "concluida", title: "Concluídas", tone: "border-t-success" },
];

type DateFilter = "todas" | "atrasadas" | "hoje" | "semana" | "futuro" | "semData";

export default function Tarefas() {
  const { data: tasks = [] } = useTasks();
  const { scope } = useScope();
  const upsert = useUpsertTask();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<string>(todayISO());
  const [quickInput, setQuickInput] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todas");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const today = todayISO();
  const weekEnd = endOfWeekISO();

  const scoped = useMemo(() => filterByScope(tasks, scope), [tasks, scope]);

  const filtered = useMemo(() => {
    if (dateFilter === "todas") return scoped;
    return scoped.filter((t: any) => {
      if (dateFilter === "semData") return !t.due_date;
      if (!t.due_date) return false;
      if (dateFilter === "atrasadas") return t.status !== "concluida" && t.due_date < today;
      if (dateFilter === "hoje") return t.due_date === today;
      if (dateFilter === "semana") return t.due_date > today && t.due_date <= weekEnd;
      if (dateFilter === "futuro") return t.due_date > weekEnd;
      return true;
    });
  }, [scoped, dateFilter, today, weekEnd]);

  const counts = useMemo(() => {
    const out: Record<DateFilter, number> = { todas: scoped.length, atrasadas: 0, hoje: 0, semana: 0, futuro: 0, semData: 0 };
    for (const t of scoped as any[]) {
      if (!t.due_date) out.semData++;
      else if (t.status !== "concluida" && t.due_date < today) out.atrasadas++;
      else if (t.due_date === today) out.hoje++;
      else if (t.due_date <= weekEnd) out.semana++;
      else out.futuro++;
    }
    return out;
  }, [scoped, today, weekEnd]);

  const byColumn = useMemo(() => {
    const map: Record<Status, any[]> = { pendente: [], em_andamento: [], concluida: [] };
    for (const t of filtered as any[]) {
      const k = (t.status as Status) || "pendente";
      if (map[k]) map[k].push(t);
    }
    // Ordenação dentro da coluna: alta > média > baixa, depois por data
    const prioOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
    for (const k of Object.keys(map) as Status[]) {
      map[k].sort((a, b) => {
        const p = (prioOrder[a.priority] ?? 9) - (prioOrder[b.priority] ?? 9);
        if (p !== 0) return p;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    }
    return map;
  }, [filtered]);

  const moveToStatus = (t: any, newStatus: Status) => {
    if (t.status === newStatus) return;
    upsert.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
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
      title="Tarefas"
      subtitle="Kanban — arraste entre colunas para mudar o status"
      action={
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-1" /> Tarefa
        </Button>
      }
    >
      {/* Quick add */}
      <Card className="p-3 mb-4 shadow-soft flex gap-2">
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

      {/* Filtros de data */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <FilterChip active={dateFilter === "todas"} onClick={() => setDateFilter("todas")} label="Todas" count={counts.todas} />
        {counts.atrasadas > 0 && (
          <FilterChip
            active={dateFilter === "atrasadas"}
            onClick={() => setDateFilter("atrasadas")}
            label="Atrasadas"
            count={counts.atrasadas}
            tone="warning"
          />
        )}
        <FilterChip active={dateFilter === "hoje"} onClick={() => setDateFilter("hoje")} label="Hoje" count={counts.hoje} />
        <FilterChip active={dateFilter === "semana"} onClick={() => setDateFilter("semana")} label="Esta semana" count={counts.semana} />
        <FilterChip active={dateFilter === "futuro"} onClick={() => setDateFilter("futuro")} label="Futuro" count={counts.futuro} />
        {counts.semData > 0 && (
          <FilterChip active={dateFilter === "semData"} onClick={() => setDateFilter("semData")} label="Sem data" count={counts.semData} />
        )}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            title={col.title}
            tone={col.tone}
            tasks={byColumn[col.key]}
            isOver={draggingId !== null}
            onDrop={(taskId) => {
              const t = (tasks as any[]).find((x) => x.id === taskId);
              if (t) moveToStatus(t, col.key);
              setDraggingId(null);
            }}
            onAdd={col.key === "pendente" ? () => openNew(today) : undefined}
            renderCard={(t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={() => openEdit(t)}
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => setDraggingId(null)}
                onReschedule={(d) => reschedule(t, d)}
              />
            )}
          />
        ))}
      </div>

      <TaskFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} task={editing} defaultDate={defaultDate} />
    </AppLayout>
  );
}

function FilterChip({
  active, onClick, label, count, tone,
}: {
  active: boolean; onClick: () => void; label: string; count: number; tone?: "warning";
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 border transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : tone === "warning"
            ? "border-warning/40 text-warning hover:bg-warning/10"
            : "border-border hover:bg-muted/50"
      }`}
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Column({
  title, tone, tasks, onDrop, onAdd, renderCard, isOver,
}: {
  title: string;
  tone: string;
  tasks: any[];
  onDrop: (taskId: string) => void;
  onAdd?: () => void;
  renderCard: (t: any) => React.ReactNode;
  isOver: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={`rounded-md border border-t-2 bg-card/50 shadow-soft flex flex-col min-h-[200px] transition-colors ${tone} ${
        over ? "bg-accent/5 border-accent/40" : ""
      }`}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b border-border/60">
        <h3 className="text-sm font-display font-semibold">{title}</h3>
        <Badge variant="outline" className="text-[10px] tabular-nums">{tasks.length}</Badge>
      </div>
      <div className="p-2 space-y-2 flex-1">
        {tasks.length === 0 && !onAdd && (
          <div className="text-xs text-muted-foreground text-center py-6">
            {isOver ? "Solte aqui" : "Vazio"}
          </div>
        )}
        {tasks.map(renderCard)}
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 flex items-center justify-center gap-1 rounded border border-dashed border-border/60 hover:border-border"
          >
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task, onEdit, onDragStart, onDragEnd, onReschedule,
}: {
  task: any;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReschedule: (days: number) => void;
}) {
  const overdue = task.due_date && task.status !== "concluida" && task.due_date < todayISO();
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group rounded border bg-card hover:shadow-elevated transition-all p-2.5 cursor-grab active:cursor-grabbing ${
        overdue ? "border-destructive/40" : "border-border"
      } ${task.status === "concluida" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`block h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            <ScopeBadge scope={task.scope} />
            {task.goal_id && <Target className="h-3 w-3 text-accent" />}
          </div>
          <p
            className={`text-sm leading-snug ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </p>
          <div className="flex items-center justify-between mt-2">
            {task.due_date ? (
              <span className={`text-[10px] flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {overdue && <AlertCircle className="h-2.5 w-2.5" />}
                <Calendar className="h-2.5 w-2.5" />
                {formatDateBR(task.due_date)}
              </span>
            ) : <span />}
            {task.status !== "concluida" && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onReschedule(1); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                  title="+1 dia"
                >
                  +1d
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReschedule(7); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                  title="+1 semana"
                >
                  +7d
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
