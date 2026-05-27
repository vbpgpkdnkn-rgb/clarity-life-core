import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StageTimeline } from "./StageTimeline";
import { ProjectMemorySidebar } from "./ProjectMemorySidebar";
import { NarrativeCorePanel } from "./pipeline/NarrativeCorePanel";
import { EvolutionLog } from "./pipeline/EvolutionLog";
import { TeleprompterMode } from "./pipeline/TeleprompterMode";
import { PipelineHeader } from "./pipeline/PipelineHeader";
import { AIQueueManager } from "./pipeline/AIQueueManager";
import { PipelineDebugPanel } from "./pipeline/PipelineDebugPanel";
import { PipelineProviderLayer } from "./pipeline/PipelineProviders";
import { RecoveryControls } from "./pipeline/RecoveryControls";
import { StageRouter } from "./pipeline/StageRouter";
import { getPipelineCollections, type PipelineAnnotation } from "./pipeline/pipelineUtils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useContentProjectQueue } from "@/hooks/useContentProjectQueue";
import {
  STAGE_LABELS,
  type ContentProject,
  type ContentProjectContext,
  useContentProject,
  useContentProjects,
  useCreateProject,
  useDeleteProject,
  useProjectStages,
} from "@/hooks/useContentProject";

const DEBUG_ENABLED = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "true";

const EMPTY_PROJECT_CONTEXT: ContentProjectContext = {
  intent: "",
  angle: "",
  tone: "",
  positioning: "",
  audience: { pains: [], desires: [], objections: [], emotional_patterns: [] },
  approved_assets: { hooks: [], metaphors: [], examples: [], phrases: [] },
  rejected: { hooks: [], directions: [] },
  narrative: { arc: "", tension_points: [], cta_type: "" },
  timing: { target_seconds: 60, density: "medio" },
};

function clampPipelineStage(stage?: number | null) {
  if (!stage || Number.isNaN(stage)) return 4;
  return Math.min(8, Math.max(1, stage));
}

export function ContentPipelineTab({ initialProjectId }: { initialProjectId?: string | null } = {}) {
  const { data: projects = [] } = useContentProjects();
  const create = useCreateProject();
  const del = useDeleteProject();
  const [activeId, setActiveId] = useState<string | null>(initialProjectId ?? null);
  const [activeStage, setActiveStage] = useState(4);
  const [newTitle, setNewTitle] = useState("");
  const [newIntent, setNewIntent] = useState("");
  const [inlineAnnotations, setInlineAnnotations] = useState<PipelineAnnotation[]>([]);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);

  // Sincroniza quando o pai pede um novo projeto seed (Motor → Esteira)
  const lastSeedRef = useRef<string | null>(null);
  if (initialProjectId && initialProjectId !== lastSeedRef.current && initialProjectId !== activeId) {
    lastSeedRef.current = initialProjectId;
    setActiveId(initialProjectId);
  }

  const { data: project, isLoading: projectLoading } = useContentProject(activeId);
  const { data: stages = [] } = useProjectStages(activeId);
  const queue = useContentProjectQueue(activeId);

  const doneStages = useMemo(() => stages.filter((stage) => stage.status === "done").map((stage) => stage.stage), [stages]);
  const safeProject = useMemo(
    () => (project ? ({ ...project, context: { ...EMPTY_PROJECT_CONTEXT, ...(project.context ?? {}) } } as ContentProject) : null),
    [project],
  );
  const { scriptParagraphs } = useMemo(() => getPipelineCollections(stages), [stages]);

  const selectProject = useCallback((id: string, currentStage?: number | null) => {
    setInlineAnnotations([]);
    setTeleprompterOpen(false);
    setActiveStage(clampPipelineStage(currentStage));
    setActiveId(id);
  }, []);

  const goBack = useCallback(() => {
    setTeleprompterOpen(false);
    setInlineAnnotations([]);
    setActiveId(null);
  }, []);

  const restoreVisualState = useCallback(() => {
    setTeleprompterOpen(false);
    setInlineAnnotations([]);
    setActiveStage(clampPipelineStage(project?.current_stage));
  }, [project?.current_stage]);

  if (!activeId) {
    return (
      <ProjectPicker
        projects={projects}
        create={create}
        del={del}
        newTitle={newTitle}
        newIntent={newIntent}
        setNewTitle={setNewTitle}
        setNewIntent={setNewIntent}
        onSelect={selectProject}
      />
    );
  }

  if (projectLoading || !safeProject) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando projeto...
      </div>
    );
  }

  const stageProps = {
    project: safeProject,
    stages,
    queueBusy: queue.isBusy,
    annotations: inlineAnnotations,
    setAnnotations: setInlineAnnotations,
    openTeleprompter: () => setTeleprompterOpen(true),
  };

  return (
    <PipelineProviderLayer project={safeProject} stages={stages}>
      <div className="space-y-3">
        <PipelineHeader project={safeProject} onBack={goBack} />
        <AIQueueManager queue={queue} />

        <ErrorBoundary scope="Bússola narrativa" resetKey={safeProject.id}>
          <NarrativeCorePanel project={safeProject} />
        </ErrorBoundary>

        <Card className="p-2">
          <StageTimeline currentStage={safeProject.current_stage} doneStages={doneStages} onStageClick={(stage) => setActiveStage(clampPipelineStage(stage))} />
        </Card>

        <div className="flex justify-end">
          <RecoveryControls projectId={safeProject.id} onReset={restoreVisualState} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div>
            <StageRouter activeStage={activeStage} onStageChange={setActiveStage} stageProps={stageProps} />
          </div>

          <div className="space-y-3">
            <ErrorBoundary scope="Memória do projeto" resetKey={safeProject.id}>
              <ProjectMemorySidebar project={safeProject} />
            </ErrorBoundary>
            <ErrorBoundary scope="Timeline de evolução" resetKey={safeProject.id}>
              <EvolutionLog project={safeProject} />
            </ErrorBoundary>
          </div>
        </div>

        <PipelineDebugPanel enabled={DEBUG_ENABLED} project={safeProject} stages={stages} activeStage={activeStage} queue={queue} />

        <TeleprompterMode
          open={teleprompterOpen}
          onClose={() => setTeleprompterOpen(false)}
          title={safeProject.title}
          paragraphs={scriptParagraphs}
        />
      </div>
    </PipelineProviderLayer>
  );
}

function ProjectPicker({
  projects,
  create,
  del,
  newTitle,
  newIntent,
  setNewTitle,
  setNewIntent,
  onSelect,
}: {
  projects: ContentProject[];
  create: ReturnType<typeof useCreateProject>;
  del: ReturnType<typeof useDeleteProject>;
  newTitle: string;
  newIntent: string;
  setNewTitle: (value: string) => void;
  setNewIntent: (value: string) => void;
  onSelect: (id: string, currentStage?: number | null) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo projeto de conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Título do conteúdo" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
          <Textarea placeholder="Intenção: por que este conteúdo precisa existir?" value={newIntent} onChange={(event) => setNewIntent(event.target.value)} rows={3} />
          <Button
            disabled={!newTitle.trim() || create.isPending}
            onClick={async () => {
              const created = await create.mutateAsync({ title: newTitle, intent: newIntent });
              onSelect(created.id, created.current_stage);
              setNewTitle("");
              setNewIntent("");
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Criar projeto
          </Button>
        </CardContent>
      </Card>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos em andamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-2 rounded border hover:bg-muted/40 cursor-pointer"
                onClick={() => onSelect(project.id, project.current_stage)}
              >
                <div>
                  <p className="text-sm font-medium">{project.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Estágio {project.current_stage} · {STAGE_LABELS[project.current_stage - 1] ?? "—"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (confirm("Remover projeto?")) del.mutate(project.id);
                  }}
                >
                  Remover
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
