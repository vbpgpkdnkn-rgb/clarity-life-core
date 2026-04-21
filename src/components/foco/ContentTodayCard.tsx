import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clapperboard, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTodayContent, useContentConsistency } from "@/hooks/useContent";
import { useScope } from "@/contexts/ScopeContext";
import { formatDateBR } from "@/lib/format";

export function ContentTodayCard() {
  const navigate = useNavigate();
  const { scope } = useScope();
  const { dueToday, next } = useTodayContent();
  const consistency = useContentConsistency(scope === "todos" ? undefined : (scope as any));

  if (dueToday.length === 0 && !next && consistency.publishedCount === 0) return null;

  return (
    <Card className="p-4 mb-4 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-accent" />
          <h3 className="font-display font-semibold text-sm">Conteúdo hoje</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/conteudo")}>
          Ver tudo <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      {dueToday.length > 0 ? (
        <div className="space-y-2">
          {dueToday.slice(0, 3).map((p) => (
            <button
              key={p.id}
              onClick={() => navigate("/conteudo")}
              className="block w-full text-left p-2 rounded border border-border bg-card hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{p.title}</div>
                <Badge variant="outline" className="text-[10px]">{p.format}</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {p.status === "pronto" ? "Pronto para publicar" : `Planejado ${p.planned_date ? formatDateBR(p.planned_date) : ""}`}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nada urgente hoje. {next && `Próximo: ${next.title} (${formatDateBR(next.planned_date!)})`}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-[11px] text-muted-foreground">Consistência da semana</span>
        <span className="text-xs font-medium">
          {consistency.publishedCount}/{consistency.targetPerWeek} · {consistency.pct}%
        </span>
      </div>
    </Card>
  );
}
