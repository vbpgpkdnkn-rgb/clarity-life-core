import { memo, useMemo } from "react";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ContentProject, ContentProjectStage } from "@/hooks/useContentProject";
import type { useContentProjectQueue } from "@/hooks/useContentProjectQueue";
import { getAllQueueSnapshots } from "@/lib/contentProjectQueue";
import { useRenderDiagnosticsContext } from "./PipelineProviders";
import { getRenderProbeSnapshot } from "./useRenderProbe";

type QueueState = ReturnType<typeof useContentProjectQueue>;

export const PipelineDebugPanel = memo(function PipelineDebugPanel({ enabled, project, stages, activeStage, queue }: {
  enabled: boolean;
  project: ContentProject;
  stages: ContentProjectStage[];
  activeStage: number;
  queue: QueueState;
}) {
  const diagnostics = useRenderDiagnosticsContext();
  const snapshot = useMemo(() => {
    if (!enabled) return null;
    return {
      projectId: project.id,
      activeStage,
      persistedStage: project.current_stage,
      loadedStages: stages.map((stage) => ({ stage: stage.stage, status: stage.status })),
      queue: {
        activeOperation: queue.activeOperation,
        pendingCount: queue.pendingCount,
        isBusy: queue.isBusy,
        lastSuccessfulPatch: queue.lastSuccessfulPatch,
        failedOperations: queue.failedOperations,
        aiLatencyMs: queue.aiLatencyMs,
        lastFailure: queue.lastFailure,
      },
      providerInstance: diagnostics.providerInstance,
      ...getRenderProbeSnapshot(),
      allQueues: getAllQueueSnapshots(),
    };
  }, [enabled, project.id, project.current_stage, stages, activeStage, queue, diagnostics.providerInstance]);

  if (!enabled || !snapshot) return null;

  return (
    <Card className="p-3 border-accent/30 bg-accent/5 text-xs">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-3.5 w-3.5 text-accent" />
        <span className="font-semibold uppercase tracking-wide">Debug da Esteira</span>
      </div>
      <pre className="max-h-72 overflow-auto rounded border bg-background/70 p-2 text-[10px] leading-relaxed">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </Card>
  );
});
