import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useUpsertTask } from "@/hooks/useData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid } from "lucide-react";

type Quadrant = "q1" | "q2" | "q3" | "q4";

const META: Record<Quadrant, { label: string; sub: string; cls: string }> = {
  q1: {
    label: "Fazer agora",
    sub: "Urgente · Importante",
    cls: "border-destructive/30 bg-destructive/5",
  },
  q2: {
    label: "Planejar",
    sub: "Não urgente · Importante",
    cls: "border-primary/30 bg-primary/5",
  },
  q3: {
    label: "Delegar",
    sub: "Urgente · Não importante",
    cls: "border-warning/30 bg-warning/5",
  },
  q4: {
    label: "Eliminar",
    sub: "Não urgente · Não importante",
    cls: "border-muted bg-muted/40",
  },
};

const inferQuadrant = (t: any): Quadrant => {
  if (t.eisenhower) return t.eisenhower as Quadrant;
  // Heurística: prioridade alta + due_date próximo => Q1
  const today = new Date().toISOString().slice(0, 10);
  const urgent = t.due_date && t.due_date <= today;
  const important = t.priority === "alta";
  if (urgent && important) return "q1";
  if (!urgent && important) return "q2";
  if (urgent && !important) return "q3";
  return "q4";
};

export function EisenhowerMatrix({ tasks }: { tasks: any[] }) {
  const navigate = useNavigate();
  const upsert = useUpsertTask();

  const grouped = useMemo(() => {
    const g: Record<Quadrant, any[]> = { q1: [], q2: [], q3: [], q4: [] };
    tasks
      .filter((t) => t.status !== "concluida")
      .forEach((t) => {
        g[inferQuadrant(t)].push(t);
      });
    return g;
  }, [tasks]);

  const onChangeQuadrant = (task: any, q: Quadrant) => {
    upsert.mutate({ ...task, eisenhower: q });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-base font-semibold">Matriz Eisenhower</h3>
        <span className="text-xs text-muted-foreground">
          · classifique e foque no que importa
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(META) as Quadrant[]).map((q) => (
          <Card key={q} className={`p-3 border ${META[q].cls} shadow-none rounded-md min-h-[140px]`}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">{META[q].label}</div>
                <div className="text-[10px] text-muted-foreground">{META[q].sub}</div>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{grouped[q].length}</span>
            </div>
            {grouped[q].length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-3 text-center">vazio</p>
            ) : (
              <ul className="space-y-1.5">
                {grouped[q].slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center gap-1.5 text-xs group">
                    <button
                      onClick={() => navigate("/tarefas")}
                      className="flex-1 text-left truncate hover:underline"
                      title={t.title}
                    >
                      {t.title}
                    </button>
                    <Select value={q} onValueChange={(v) => onChangeQuadrant(t, v as Quadrant)}>
                      <SelectTrigger className="h-5 w-7 p-0 border-0 bg-transparent text-[10px] opacity-0 group-hover:opacity-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="q1">Fazer agora</SelectItem>
                        <SelectItem value="q2">Planejar</SelectItem>
                        <SelectItem value="q3">Delegar</SelectItem>
                        <SelectItem value="q4">Eliminar</SelectItem>
                      </SelectContent>
                    </Select>
                  </li>
                ))}
                {grouped[q].length > 4 && (
                  <li className="text-[10px] text-muted-foreground">+{grouped[q].length - 4} outras</li>
                )}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
