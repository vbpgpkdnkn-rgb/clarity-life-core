import type { ContentProject, ContentProjectStage } from "@/hooks/useContentProject";

export type PipelineCollectionKey = "blocks" | "topics" | "paragraphs";

export type PipelineAnnotation = { block_id?: string; type?: string; severity?: string; message?: string; suggestion?: string };
export type PipelineBlock = {
  id: string;
  role?: string;
  text?: string;
  main_idea?: string;
  micro_hook?: string;
  strong_phrase?: string;
  recording_note?: string;
  target_seconds?: number;
  emotional_goal?: string;
  tension?: string;
  last_rationale?: string;
};
export type PipelineCritic = {
  overall_score?: number;
  retention_estimate?: string;
  diagnostics?: Array<{ severity?: string; type?: string; paragraph_role?: string; reason?: string; suggestion?: string }>;
  alternatives?: { hooks?: string[]; ctas?: string[] };
};

export interface PipelineStageProps {
  project: ContentProject;
  stages: ContentProjectStage[];
  queueBusy: boolean;
  annotations: PipelineAnnotation[];
  setAnnotations: (items: PipelineAnnotation[]) => void;
  openTeleprompter: () => void;
}

export function ensureIds<T extends { id?: string }>(arr: T[] | undefined, prefix: string): (T & { id: string })[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item, index) => ({ ...item, id: item.id ?? `${prefix}${index + 1}` }));
}

export function stageOutput(stages: ContentProjectStage[], stage: number): Record<string, unknown> | null {
  const output = stages.find((item) => item.stage === stage)?.output;
  return output && typeof output === "object" ? output as Record<string, unknown> : null;
}

export function getPipelineCollections(stages: ContentProjectStage[]) {
  const structureRaw = stageOutput(stages, 4);
  const topicsRaw = stageOutput(stages, 5);
  const scriptRaw = stageOutput(stages, 6);

  return {
    structureBlocks: ensureIds(structureRaw?.blocks as PipelineBlock[] | undefined, "b"),
    topicsList: ensureIds(topicsRaw?.topics as PipelineBlock[] | undefined, "t"),
    scriptParagraphs: ensureIds(scriptRaw?.paragraphs as PipelineBlock[] | undefined, "p"),
    critic: stageOutput(stages, 7) as PipelineCritic | null,
  };
}
