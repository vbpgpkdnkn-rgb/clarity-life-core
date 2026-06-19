/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useMemo } from "react";
import { AlertTriangle, Clock, Loader2, PlayCircle, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditableBlock } from "../EditableBlock";
import { ExportControls } from "../ExportControls";
import { useRunStageAgent } from "@/hooks/useContentProject";
import { formatDuration, retentionRisk, totalSeconds } from "@/lib/timing";
import { getPipelineCollections, type PipelineStageProps } from "../pipelineUtils";
import { useRenderProbe } from "../useRenderProbe";

export const ScriptStage = memo(function ScriptStage({ project, stages, queueBusy, annotations, openTeleprompter }: PipelineStageProps) {
  useRenderProbe("ScriptStage");
  const runAgent = useRunStageAgent();
  const { topicsList, scriptParagraphs } = useMemo(() => getPipelineCollections(stages), [stages]);
  const annotationsByBlock = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    annotations.forEach((annotation) => {
      if (!annotation.block_id) return;
      grouped[annotation.block_id] = [...(grouped[annotation.block_id] ?? []), annotation];
    });
    return grouped;
  }, [annotations]);

  const ctx = (project.context as any) ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Roteiro final</CardTitle>
        <Button
          size="sm"
          disabled={!topicsList.length || runAgent.isPending || queueBusy}
          onClick={() => runAgent.mutate({ project, agent: "script-writer", stage: 6, payload: {
            topics: topicsList,
            energia: ctx.energia ?? null,
            voz_psicologa: ctx.intent ?? project.intent ?? "",
            audiencia: ctx.audience_context ?? "",
          } })}
        >
          {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
          {scriptParagraphs.length ? "Refinar roteiro" : "Gerar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!topicsList.length && <p className="text-xs text-muted-foreground">Gere os tópicos antes.</p>}
        {scriptParagraphs.length > 0 && <ScriptHeader paragraphs={scriptParagraphs} />}
        {scriptParagraphs.map((paragraph, index) => (
          <EditableBlock
            key={paragraph.id}
            project={project}
            stage={6}
            collectionKey="paragraphs"
            block={paragraph as any}
            textField="text"
            index={index}
            annotations={annotationsByBlock[paragraph.id] ?? []}
          />
        ))}
        {scriptParagraphs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground italic">Pronto para gravar? Use o teleprompter premium ou exporte para outro formato.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" className="gap-1.5" onClick={openTeleprompter}>
                <PlayCircle className="h-3.5 w-3.5" /> Modo gravação
              </Button>
              <ExportControls paragraphs={scriptParagraphs as any} annotations={annotations} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ScriptHeader = memo(function ScriptHeader({ paragraphs }: { paragraphs: any[] }) {
  const blocks = useMemo(() => paragraphs.map((p: any) => ({ text: p.text ?? "", role: p.role, target_seconds: p.target_seconds })), [paragraphs]);
  const total = useMemo(() => totalSeconds(blocks), [blocks]);
  const alerts = useMemo(() => retentionRisk(blocks), [blocks]);

  return (
    <>
      {total > 65 && (
        <div className="flex items-start gap-2 p-2 rounded text-xs border border-destructive/50 bg-destructive/10 text-destructive font-medium">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>⚠️ Roteiro com {Math.round(total)} segundos — Reel ideal entre 30s e 60s. Refine antes de avançar.</span>
        </div>
      )}
      <div className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Total estimado: <strong>{formatDuration(total)}</strong></span>
      </div>
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded text-xs border ${
                alert.severity === "danger"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : alert.severity === "warn"
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-border bg-muted/30"
              }`}
            >
              <AlertTriangle className="h-3 w-3 mt-0.5" /> {alert.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
});
