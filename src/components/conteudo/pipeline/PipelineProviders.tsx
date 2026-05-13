/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, memo, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import type { ContentProject, ContentProjectStage } from "@/hooks/useContentProject";

type NarrativeCoreValue = Record<string, string>;
type ProjectMemoryValue = Record<string, any>;

const NarrativeCoreContext = createContext<NarrativeCoreValue>({});
const ProjectMemoryContext = createContext<ProjectMemoryValue>({});
const RenderDiagnosticsContext = createContext<{ providerInstance: number }>({ providerInstance: 0 });

export function useNarrativeCore() {
  return useContext(NarrativeCoreContext);
}

export function useProjectMemory() {
  return useContext(ProjectMemoryContext);
}

export function useRenderDiagnosticsContext() {
  return useContext(RenderDiagnosticsContext);
}

export const NarrativeCoreProvider = memo(function NarrativeCoreProvider({ project, children }: { project: ContentProject; children: ReactNode }) {
  const value = useMemo(() => ((project.context as any)?.narrative_core ?? {}) as NarrativeCoreValue, [project.context]);
  return <NarrativeCoreContext.Provider value={value}>{children}</NarrativeCoreContext.Provider>;
});

export const ProjectMemoryProvider = memo(function ProjectMemoryProvider({ project, children }: { project: ContentProject; children: ReactNode }) {
  const value = useMemo(() => ({ ...((project.context as any) ?? {}) }), [project.context]);
  return <ProjectMemoryContext.Provider value={value}>{children}</ProjectMemoryContext.Provider>;
});

export function RecoveryLayer({ projectId, stages, children }: { projectId: string; stages: ContentProjectStage[]; children: ReactNode }) {
  const lastSnapshotRef = useRef<string | null>(null);
  const snapshot = useMemo(() => JSON.stringify({ projectId, stageCount: stages.length, savedAt: new Date().toISOString() }), [projectId, stages.length]);

  useEffect(() => {
    if (lastSnapshotRef.current === snapshot) return;
    lastSnapshotRef.current = snapshot;
    try {
      sessionStorage.setItem(`content-pipeline:last-stable:${projectId}`, snapshot);
    } catch {
      // sessionStorage can be unavailable; recovery remains non-blocking.
    }
  }, [projectId, snapshot]);

  return <>{children}</>;
}

export function PipelineProviderLayer({ project, stages, children }: { project: ContentProject; stages: ContentProjectStage[]; children: ReactNode }) {
  const providerInstance = useRef(Math.floor(Math.random() * 1_000_000));
  const diagnostics = useMemo(() => ({ providerInstance: providerInstance.current }), []);

  return (
    <RenderDiagnosticsContext.Provider value={diagnostics}>
      <NarrativeCoreProvider project={project}>
        <ProjectMemoryProvider project={project}>
          <RecoveryLayer projectId={project.id} stages={stages}>{children}</RecoveryLayer>
        </ProjectMemoryProvider>
      </NarrativeCoreProvider>
    </RenderDiagnosticsContext.Provider>
  );
}
