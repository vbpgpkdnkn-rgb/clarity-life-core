import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Recycle, Lightbulb } from "lucide-react";
import { ContentPiece, useUpsertPiece } from "@/hooks/useContent";
import {
  useContentInsights, useContentReuseSuggest,
} from "@/hooks/useStoriesAndReferences";
import { useScope } from "@/contexts/ScopeContext";
import { toast } from "sonner";

export function IntelligenceTab({ pieces, metrics }: { pieces: ContentPiece[]; metrics: any[] }) {
  const insights = useContentInsights();
  const reuse = useContentReuseSuggest();
  const upsert = useUpsertPiece();
  const { scope } = useScope();

  const published = pieces.filter((p) => p.status === "publicado");

  const runInsights = () => {
    if (published.length === 0) {
      toast.info("Publique algumas peças antes de gerar insights");
      return;
    }
    insights.mutate({
      pieces: published.map((p) => ({
        id: p.id, title: p.title, theme: p.theme, format: p.format, published_at: p.published_at,
      })),
      metrics: metrics.map((m) => ({
        piece_id: m.piece_id, views: m.views, likes: m.likes, comments: m.comments, shares: m.shares,
        saves: m.saves, reach: m.reach, engagement_rate: m.engagement_rate,
      })),
    });
  };

  const runReuse = () => {
    const old = published.filter((p) => {
      if (!p.published_at) return false;
      const days = (Date.now() - new Date(p.published_at).getTime()) / 86400000;
      return days >= 30;
    });
    if (old.length === 0) {
      toast.info("Sem posts antigos (>30 dias) para reaproveitar ainda");
      return;
    }
    reuse.mutate({
      pieces: old.map((p) => ({
        id: p.id, title: p.title, theme: p.theme, format: p.format, published_at: p.published_at, hook: p.hook,
      })),
      metrics,
    });
  };

  const createFromReuse = (s: { piece_id: string; original_title: string; new_format: string; new_angle: string }) => {
    const original = pieces.find((p) => p.id === s.piece_id);
    upsert.mutate({
      title: s.new_angle || `${s.original_title} (versão ${s.new_format})`,
      theme: original?.theme ?? null,
      format: s.new_format as any,
      status: "ideia",
      scope: (scope === "todos" ? "profissional" : scope) as any,
    });
  };

  return (
    <div className="space-y-4">
      {/* Insights de performance */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h3 className="font-display font-semibold">Padrões de performance</h3>
            </div>
            <p className="text-xs text-muted-foreground">A IA identifica o que funciona e o que repetir.</p>
          </div>
          <Button onClick={runInsights} disabled={insights.isPending} size="sm">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {insights.isPending ? "Analisando…" : "Analisar"}
          </Button>
        </div>

        {insights.data && (
          <div className="space-y-4 border-t border-border pt-3">
            <p className="text-sm">{insights.data.insights.summary}</p>

            {insights.data.insights.top_themes.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Temas que performam
                </div>
                <div className="space-y-1.5">
                  {insights.data.insights.top_themes.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge className="text-[10px]">{t.theme}</Badge>
                      <span className="text-xs text-muted-foreground">{t.evidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.data.insights.top_formats.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Formatos campeões
                </div>
                <div className="space-y-1.5">
                  {insights.data.insights.top_formats.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px]">{f.format}</Badge>
                      <span className="text-xs text-muted-foreground">{f.evidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.data.insights.recommendations.length > 0 && (
              <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
                <div className="text-[10px] uppercase tracking-widest text-accent mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Recomendações
                </div>
                <ul className="space-y-1.5 text-sm">
                  {insights.data.insights.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insights.data.insights.reuse_suggestions.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Reaproveitamento sugerido
                </div>
                <div className="space-y-1.5">
                  {insights.data.insights.reuse_suggestions.map((r, i) => (
                    <div key={i} className="text-xs border border-border rounded p-2">
                      <div className="font-medium">{r.title} → {r.new_format}</div>
                      <div className="text-muted-foreground">{r.why}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Reaproveitamento */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Recycle className="h-4 w-4 text-accent" />
              <h3 className="font-display font-semibold">Reaproveitamento inteligente</h3>
            </div>
            <p className="text-xs text-muted-foreground">Posts antigos que podem virar novo formato.</p>
          </div>
          <Button onClick={runReuse} disabled={reuse.isPending} size="sm">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {reuse.isPending ? "Buscando…" : "Sugerir"}
          </Button>
        </div>

        {reuse.data && (
          <div className="space-y-2 border-t border-border pt-3">
            {reuse.data.suggestions.map((s, i) => (
              <div key={i} className="border border-border rounded p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.new_angle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Original: <span className="italic">{s.original_title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.why}</div>
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  <Badge variant="outline" className="text-[10px]">{s.new_format}</Badge>
                  <Button size="sm" variant="outline" onClick={() => createFromReuse(s)}>
                    Criar peça
                  </Button>
                </div>
              </div>
            ))}
            {reuse.data.suggestions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                IA não encontrou candidatos. Publique mais ou registre métricas.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
