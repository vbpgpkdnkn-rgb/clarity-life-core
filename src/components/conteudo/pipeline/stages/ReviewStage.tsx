/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInlineCritique } from "@/hooks/usePipelineEditor";
import { useRunStageAgent } from "@/hooks/useContentProject";
import { getPipelineCollections, type PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const ReviewStage = memo(function ReviewStage({ project, stages, queueBusy, setAnnotations }: PipelineStageProps) {
  useRenderProbe("ReviewStage");
  const runAgent = useRunStageAgent();
  const inlineCritique = useInlineCritique();
  const { scriptParagraphs, critic } = useMemo(() => getPipelineCollections(stages), [stages]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-base">Revisão crítica</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!scriptParagraphs.length || runAgent.isPending || queueBusy}
            onClick={() => runAgent.mutate({ project, agent: "script-critic", stage: 7, payload: { paragraphs: scriptParagraphs } })}
          >
            {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Analisar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!scriptParagraphs.length || inlineCritique.isPending || queueBusy}
            onClick={() => inlineCritique.mutate(
              { project, blocks: scriptParagraphs.map((p: any) => ({ id: p.id, role: p.role, text: p.text ?? "" })) },
              { onSuccess: (data: any) => setAnnotations(data?.annotations ?? []) },
            )}
          >
            {inlineCritique.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            Revisão inline
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!scriptParagraphs.length && <p className="text-xs text-muted-foreground">Gere o roteiro antes.</p>}
        {critic && (
          <>
            <div className="flex items-center gap-3">
              <Badge variant="outline">Score {critic.overall_score}/100</Badge>
              <Badge>Retenção: {critic.retention_estimate}</Badge>
            </div>
            {critic.diagnostics?.map((diagnostic: any, index: number) => (
              <div key={index} className="border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={diagnostic.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {diagnostic.severity}
                  </Badge>
                  <span className="text-xs font-medium">{diagnostic.type}</span>
                  <span className="text-[11px] text-muted-foreground">· {diagnostic.paragraph_role}</span>
                </div>
                <p className="text-xs text-muted-foreground">{diagnostic.reason}</p>
                <p className="text-xs"><span className="font-medium">Sugestão:</span> {diagnostic.suggestion}</p>
              </div>
            ))}
            {critic.alternatives && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                <div>
                  <p className="text-xs font-semibold mb-1">Hooks alternativos</p>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    {critic.alternatives.hooks?.map((hook: string, index: number) => <li key={index}>{hook}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">CTAs alternativos</p>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    {critic.alternatives.ctas?.map((cta: string, index: number) => <li key={index}>{cta}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
