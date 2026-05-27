/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditableBlock } from "../EditableBlock";
import { useRunStageAgent } from "@/hooks/useContentProject";
import { getPipelineCollections, type PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const StructureStage = memo(function StructureStage({ project, stages, queueBusy }: PipelineStageProps) {
  useRenderProbe("StructureStage");
  const runAgent = useRunStageAgent();
  const { structureBlocks } = useMemo(() => getPipelineCollections(stages), [stages]);
  const ctx = (project.context as any) ?? {};
  const energyPayload = {
    energia: ctx.energia ?? null,
    voz_psicologa: ctx.intent ?? project.intent ?? "",
    audiencia: ctx.audience_context ?? "",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Arco narrativo</CardTitle>
        <Button size="sm" onClick={() => runAgent.mutate({ project, agent: "structurer", stage: 4, payload: energyPayload })} disabled={runAgent.isPending || queueBusy}>
          {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
          {structureBlocks.length ? "Refinar etapa" : "Gerar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!structureBlocks.length && <p className="text-xs text-muted-foreground">Gere a estrutura — depois edite cada bloco diretamente, peça alternativas ou refine por tom.</p>}
        {structureBlocks.map((block, index) => (
          <EditableBlock key={block.id} project={project} stage={4} collectionKey="blocks" block={block as any} textField="main_idea" index={index} />
        ))}
      </CardContent>
    </Card>
  );
});
