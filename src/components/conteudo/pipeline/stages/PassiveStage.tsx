/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const IdeaStage = memo(function IdeaStage({ project }: PipelineStageProps) {
  useRenderProbe("IdeaStage");
  return <PassiveStage title="Ideia" body={project.intent ?? "A ideia inicial fica preservada como base contextual do projeto."} />;
});

export const AudienceStage = memo(function AudienceStage({ project }: PipelineStageProps) {
  useRenderProbe("AudienceStage");
  const audience = (project.context as any)?.audience;
  const summary = [audience?.pains?.[0], audience?.desires?.[0], audience?.objections?.[0]].filter(Boolean).join(" · ");
  return <PassiveStage title="Audiência" body={summary || "A memória de audiência fica disponível na lateral sem forçar geração global."} />;
});

export const StrategyStage = memo(function StrategyStage({ project }: PipelineStageProps) {
  useRenderProbe("StrategyStage");
  const core = (project.context as any)?.narrative_core ?? {};
  const body = core.promise || core.positioning || project.intent || "A estratégia herda a bússola narrativa e alimenta as etapas seguintes.";
  return <PassiveStage title="Estratégia" body={body} />;
});

export const ProductionStage = memo(function ProductionStage() {
  useRenderProbe("ProductionStage");
  return <PassiveStage title="Produção" body="A etapa de produção permanece isolada para teleprompter, exportação e operação final sem afetar o editor." />;
});

function PassiveStage({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}
