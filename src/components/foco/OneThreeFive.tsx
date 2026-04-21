import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useUpsertTask } from "@/hooks/useData";
import { Circle, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Slot = "1" | "3" | "5";
const SLOT_META: Record<Slot, { label: string; cap: number; hint: string }> = {
  "1": { label: "1 grande", cap: 1, hint: "A tarefa que mais move o ponteiro" },
  "3": { label: "3 médias", cap: 3, hint: "Importantes mas não definidoras" },
  "5": { label: "5 pequenas", cap: 5, hint: "Pequenas vitórias, manutenção" },
};

export function OneThreeFive({ tasks }: { tasks: any[] }) {
  const upsert = useUpsertTask();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const g: Record<Slot, any[]> = { "1": [], "3": [], "5": [] };
    tasks
      .filter((t) => t.is_135 && (t.due_date === today || t.due_date === null))
      .forEach((t) => {
        if (g[t.is_135 as Slot]) g[t.is_135 as Slot].push(t);
      });
    return g;
  }, [tasks, today]);

  const toggleDone = (t: any) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    upsert.mutate({
      ...t,
      status: newStatus,
      completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
    });
  };

  const totalAssigned = grouped["1"].length + grouped["3"].length + grouped["5"].length;
  const totalDone = [...grouped["1"], ...grouped["3"], ...grouped["5"]].filter(
    (t) => t.status === "concluida",
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-semibold">Regra 1-3-5</h3>
          <p className="text-xs text-muted-foreground">
            {totalDone}/{totalAssigned} concluídas hoje
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate("/tarefas")}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Atribuir
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {(Object.keys(SLOT_META) as Slot[]).map((s) => {
          const items = grouped[s];
          const cap = SLOT_META[s].cap;
          return (
            <Card key={s} className="p-3 border-border/60 shadow-none">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide">{SLOT_META[s].label}</div>
                  <div className="text-[10px] text-muted-foreground">{SLOT_META[s].hint}</div>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {items.length}/{cap}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-3 text-center">vazio</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((t) => {
                    const done = t.status === "concluida";
                    return (
                      <li key={t.id} className="flex items-start gap-2 text-xs">
                        <button onClick={() => toggleDone(t)} className="shrink-0 mt-0.5">
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <span className={done ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                          {t.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
