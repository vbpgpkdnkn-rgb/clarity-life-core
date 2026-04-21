import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, Lightbulb, Target } from "lucide-react";
import { useHabitGapAnalyzer, ROOT_CAUSE_LABEL, ACTION_LABEL } from "@/hooks/useHabitGapAnalyzer";
import { toast } from "sonner";

interface Props {
  habits: any[];
  logs: any[];
}

export function HabitGapPanel({ habits, logs }: Props) {
  const analyzer = useHabitGapAnalyzer();

  const run = () => {
    const active = habits.filter((h) => h.active && !h.archived);
    if (active.length === 0) {
      toast.info("Crie hábitos antes de rodar a análise");
      return;
    }
    analyzer.mutate({ habits: active, logs, window_days: 14 });
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-accent" />
            <h3 className="font-display text-lg font-semibold">Gap analysis dos hábitos</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            A IA detecta quais hábitos não estão funcionando e sugere ajustes específicos.
          </p>
        </div>
        <Button onClick={run} disabled={analyzer.isPending} size="sm">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {analyzer.isPending ? "Analisando…" : "Analisar"}
        </Button>
      </div>

      {analyzer.data && (
        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-sm">{analyzer.data.summary}</p>

          {analyzer.data.gaps.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Hábitos com baixa execução
              </div>
              {analyzer.data.gaps.map((g, i) => (
                <div key={i} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{g.habit_name}</div>
                    <Badge variant="outline" className="text-[10px] tabular-nums">
                      {Math.round(g.completion_rate)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Causa raiz: <span className="font-medium text-foreground">{ROOT_CAUSE_LABEL[g.root_cause] ?? g.root_cause}</span>
                  </div>
                  <div className="rounded bg-accent/5 border border-accent/20 p-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent">
                      <Lightbulb className="h-3 w-3" />
                      {ACTION_LABEL[g.suggestion.action] ?? g.suggestion.action}
                    </div>
                    <div className="text-sm">{g.suggestion.detail}</div>
                    <div className="text-xs text-muted-foreground">→ {g.suggestion.expected_impact}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {analyzer.data.winning_pattern && (
            <div className="rounded-md bg-success/5 border border-success/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-success mb-1">Padrão vencedor</div>
              <p className="text-sm">{analyzer.data.winning_pattern}</p>
            </div>
          )}

          {analyzer.data.next_test && (
            <div className="rounded-md bg-muted p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" /> Experimento da semana
              </div>
              <p className="text-sm">{analyzer.data.next_test}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
