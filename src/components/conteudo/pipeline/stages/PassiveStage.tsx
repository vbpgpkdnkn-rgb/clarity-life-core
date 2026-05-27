/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUpdateProjectContext } from "@/hooks/useContentProject";
import { EnergiaBadge } from "@/components/conteudo/EnergiaUI";
import type { PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const IdeaStage = memo(function IdeaStage({ project }: PipelineStageProps) {
  useRenderProbe("IdeaStage");
  const ctx = (project.context as any) ?? {};
  const update = useUpdateProjectContext();
  const initial = ctx.intent ?? project.intent ?? "";
  const [draft, setDraft] = useState<string>(initial);
  useEffect(() => { setDraft(initial); }, [initial]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ideia e intenção</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Por que este conteúdo precisa existir?
          </label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== initial) {
                update.mutate({ id: project.id, patch: { intent: draft } as any });
              }
            }}
            placeholder="Descreva a intenção — a voz da psicóloga sobre este tema..."
            rows={4}
            className="mt-1"
          />
        </div>
        {ctx.energia && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Energia:</span>
            <EnergiaBadge energia={ctx.energia} />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const AudienceStage = memo(function AudienceStage({ project }: PipelineStageProps) {
  useRenderProbe("AudienceStage");
  const ctx = (project.context as any) ?? {};
  const audience = ctx.audience ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contexto da audiência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ctx.audience_context ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded p-3">
            {ctx.audience_context}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma análise de audiência importada. Use a aba "Inteligência de Audiência" e envie ao Motor → Esteira para preencher automaticamente.
          </p>
        )}
        {Array.isArray(audience.pains) && audience.pains.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tensões identificadas</div>
            {audience.pains.map((p: string, i: number) => (
              <div key={i} className="text-xs border-l-2 border-accent/30 pl-2 mb-1">{p}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const StrategyStage = memo(function StrategyStage({ project }: PipelineStageProps) {
  useRenderProbe("StrategyStage");
  const ctx = (project.context as any) ?? {};
  const core = ctx.narrative_core ?? {};
  const energia = ctx.energia;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estratégia do conteúdo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {energia && (
          <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
            <span className="text-xs text-muted-foreground">Energia estratégica:</span>
            <EnergiaBadge energia={energia} />
          </div>
        )}
        {ctx.tone && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tom</div>
            <p className="text-sm mt-0.5">{ctx.tone}</p>
          </div>
        )}
        {core.promise && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Promessa</div>
            <p className="text-sm mt-0.5">{core.promise}</p>
          </div>
        )}
        {core.positioning && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Posicionamento</div>
            <p className="text-sm mt-0.5">{core.positioning}</p>
          </div>
        )}
        {!core.promise && !energia && !ctx.tone && (
          <p className="text-xs text-muted-foreground">
            Preencha a bússola acima para definir a estratégia deste conteúdo.
          </p>
        )}
      </CardContent>
    </Card>
  );
});

export const ProductionStage = memo(function ProductionStage() {
  useRenderProbe("ProductionStage");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Produção</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Etapa isolada para teleprompter, exportação e operação final sem afetar o editor.
        </p>
      </CardContent>
    </Card>
  );
});
