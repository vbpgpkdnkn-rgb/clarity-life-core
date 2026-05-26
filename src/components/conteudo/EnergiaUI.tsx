import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ENERGIA_META, ENERGIAS, type Energia } from "@/lib/energia";
import type { DistribuicaoSemana } from "@/hooks/useDistribuicaoSemana";
import { cn } from "@/lib/utils";

export function EnergiaBadge({
  energia,
  prioritaria,
  className,
}: {
  energia?: Energia | null;
  prioritaria?: boolean;
  className?: string;
}) {
  if (!energia) return null;
  const meta = ENERGIA_META[energia];
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] gap-1", meta.badge, className)}
      title={meta.descricao}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full inline-block", meta.dot)} />
      {meta.curto}
      {prioritaria && <span className="ml-1 opacity-80">✦</span>}
    </Badge>
  );
}

export function EnergiaDots({
  contagem,
  alvo,
  energia,
}: {
  contagem: number;
  alvo: number;
  energia: Energia;
}) {
  const meta = ENERGIA_META[energia];
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: alvo }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i < contagem ? meta.dot : meta.dotEmpty,
          )}
        />
      ))}
    </div>
  );
}

export function EnergiaSelector({
  value,
  onChange,
  sugerida,
}: {
  value: Energia | null;
  onChange: (e: Energia) => void;
  sugerida?: Energia | null;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {ENERGIAS.map((e) => {
        const meta = ENERGIA_META[e];
        const selected = value === e;
        const isSugerida = sugerida === e && !selected;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={cn(
              "text-left rounded-lg border p-3 transition-all hover:shadow-sm",
              selected
                ? cn(meta.border, meta.bg, "ring-1 ring-offset-0")
                : "border-border bg-card hover:border-foreground/20",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {e}
                </span>
              </div>
              {isSugerida && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  ✦ falta esta semana
                </Badge>
              )}
            </div>
            <div className="text-sm font-medium leading-snug">{meta.curto}</div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-3">
              {meta.descricao}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Painel compacto com a distribuição da semana — usado no Pipeline e Editorial.
 */
export function DistribuicaoPanel({
  distrib,
  onEnergiaClick,
  compact,
}: {
  distrib: DistribuicaoSemana;
  onEnergiaClick?: (e: Energia) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "md:grid-cols-3" : "md:grid-cols-3")}>
      {ENERGIAS.map((e) => {
        const meta = ENERGIA_META[e];
        const c = distrib.contagem[e];
        const alvo = distrib.alvo[e];
        const done = c >= alvo;
        const isProxima = distrib.proxima === e;
        return (
          <button
            key={e}
            type="button"
            disabled={!onEnergiaClick}
            onClick={() => onEnergiaClick?.(e)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              done ? cn(meta.border, meta.bg) : "border-border bg-card",
              isProxima && !done && "ring-1 ring-foreground/10",
              onEnergiaClick && "hover:border-foreground/30 cursor-pointer",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {e}
                </span>
              </div>
              <span className={cn("text-xs font-display font-semibold", done && "text-foreground")}>
                {c}/{alvo}
              </span>
            </div>
            <EnergiaDots contagem={c} alvo={alvo} energia={e} />
            <div className="text-[11px] text-muted-foreground mt-2 leading-snug">
              {meta.curto}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Card de status estratégico — destacado, com CTA.
 */
export function StatusEstrategicoCard({
  distrib,
  onCriar,
  onVerEditorial,
}: {
  distrib: DistribuicaoSemana;
  onCriar?: (e: Energia) => void;
  onVerEditorial?: () => void;
}) {
  if (distrib.completa) {
    return (
      <Card className="p-4 border-emerald-500/40 bg-emerald-500/5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">
              ✓ Semana estratégica completa
            </div>
            <div className="text-sm">
              Distribuição saudável: {distrib.contagem.topo} topos · {distrib.contagem.meio} meio · {distrib.contagem.fundo} fundo
            </div>
          </div>
          {onVerEditorial && (
            <Button size="sm" variant="ghost" onClick={onVerEditorial}>
              Ver editorial
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const prox = distrib.proxima;
  const meta = prox ? ENERGIA_META[prox] : null;

  return (
    <Card className={cn("p-4", meta?.border, meta?.bg)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Status estratégico da semana
          </div>
          <DistribuicaoPanel distrib={distrib} compact />
          {meta && (
            <p className="text-xs text-muted-foreground pt-1">
              Próximo passo: criar um conteúdo de <strong className="text-foreground">{meta.curto}</strong>.
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {onVerEditorial && (
            <Button size="sm" variant="ghost" onClick={onVerEditorial}>
              Editorial
            </Button>
          )}
          {prox && onCriar && (
            <Button size="sm" onClick={() => onCriar(prox)}>
              Criar {meta!.curto}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
