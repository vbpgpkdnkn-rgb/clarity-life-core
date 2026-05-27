/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditableBlock } from "../EditableBlock";
import { useRunStageAgent } from "@/hooks/useContentProject";
import { getPipelineCollections, type PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const TopicsStage = memo(function TopicsStage({ project, stages, queueBusy }: PipelineStageProps) {
  useRenderProbe("TopicsStage");
  const runAgent = useRunStageAgent();
  const { structureBlocks, topicsList } = useMemo(() => getPipelineCollections(stages), [stages]);
  const ctx = (project.context as any) ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tópicos de gravação</CardTitle>
        <Button
          size="sm"
          disabled={!structureBlocks.length || runAgent.isPending || queueBusy}
          onClick={() => runAgent.mutate({ project, agent: "topic-writer", stage: 5, payload: {
            blocks: structureBlocks,
            energia: ctx.energia ?? null,
            voz_psicologa: ctx.intent ?? project.intent ?? "",
            audiencia: ctx.audience_context ?? "",
            instruction: "Cada tópico é uma PERGUNTA específica ao raciocínio da psicóloga (não ao tema genérico) que ela responde na câmera com história/observação clínica/exemplo concreto.",
          } })}
        >
          {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
          {topicsList.length ? "Refinar etapa" : "Gerar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!structureBlocks.length && <p className="text-xs text-muted-foreground">Gere a estrutura antes.</p>}
        {topicsList.map((topic, index) => (
          <EditableBlock key={topic.id} project={project} stage={5} collectionKey="topics" block={topic as any} textField="strong_phrase" index={index} />
        ))}
      </CardContent>
    </Card>
  );
});
