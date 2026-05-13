import { useMemo, useState } from "react";
import { Plus, Wand2, Loader2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectMemorySidebar } from "./ProjectMemorySidebar";
import { StageTimeline } from "./StageTimeline";
import { NarrativeCorePanel } from "./pipeline/NarrativeCorePanel";
import { EditableBlock } from "./pipeline/EditableBlock";
import { EvolutionLog } from "./pipeline/EvolutionLog";
import { ExportControls } from "./pipeline/ExportControls";
import { useContentProjectQueue } from "@/hooks/useContentProjectQueue";
import { useInlineCritique } from "@/hooks/usePipelineEditor";
import {
  useContentProjects,
  useContentProject,
  useCreateProject,
  useDeleteProject,
  useProjectStages,
  useRunStageAgent,
  STAGE_LABELS,
} from "@/hooks/useContentProject";
import { formatDuration, retentionRisk, totalSeconds } from "@/lib/timing";

// garante que cada item da coleção tenha um id estável
function ensureIds<T extends { id?: string }>(arr: T[] | undefined, prefix: string): (T & { id: string })[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((b, i) => ({ ...b, id: b.id ?? `${prefix}${i + 1}` }));
}

export function ContentPipelineTab() {
  const { data: projects = [] } = useContentProjects();
  const create = useCreateProject();
  const del = useDeleteProject();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: project } = useContentProject(activeId);
  const { data: stages = [] } = useProjectStages(activeId);
  const runAgent = useRunStageAgent();
  const queue = useContentProjectQueue(activeId);
  const inlineCritique = useInlineCritique();

  const [newTitle, setNewTitle] = useState("");
  const [newIntent, setNewIntent] = useState("");
  const [inlineAnnotations, setInlineAnnotations] = useState<any[]>([]);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);

  const doneStages = useMemo(() => stages.filter((s) => s.status === "done").map((s) => s.stage), [stages]);
  const stageOutput = (n: number) => stages.find((s) => s.stage === n)?.output ?? null;

  const structureRaw = stageOutput(4);
  const topicsRaw = stageOutput(5);
  const scriptRaw = stageOutput(6);
  const critic = stageOutput(7);

  const structureBlocks = useMemo(() => ensureIds(structureRaw?.blocks, "b"), [structureRaw]);
  const topicsList = useMemo(() => ensureIds(topicsRaw?.topics, "t"), [topicsRaw]);
  const scriptParagraphs = useMemo(() => ensureIds(scriptRaw?.paragraphs, "p"), [scriptRaw]);
  const annotationsByBlock = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    inlineAnnotations.forEach((a) => {
      if (!a.block_id) return;
      grouped[a.block_id] = [...(grouped[a.block_id] ?? []), a];
    });
    return grouped;
  }, [inlineAnnotations]);

  if (!activeId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo projeto de conteúdo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Título do conteúdo"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="Intenção: por que este conteúdo precisa existir?"
              value={newIntent}
              onChange={(e) => setNewIntent(e.target.value)}
              rows={3}
            />
            <Button
              disabled={!newTitle.trim() || create.isPending}
              onClick={async () => {
                const p = await create.mutateAsync({ title: newTitle, intent: newIntent });
                setActiveId(p.id);
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
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded border hover:bg-muted/40 cursor-pointer"
                  onClick={() => setActiveId(p.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Estágio {p.current_stage} · {STAGE_LABELS[p.current_stage - 1] ?? "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Remover projeto?")) del.mutate(p.id);
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

  if (!project) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando projeto...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
            ← Voltar à lista
          </Button>
          <h2 className="text-lg font-semibold">{project.title}</h2>
        </div>
        <Badge variant="outline">Estágio atual: {project.current_stage} · {STAGE_LABELS[project.current_stage - 1]}</Badge>
      </div>

      {queue.isBusy && (
        <Card className="p-2 border-primary/30 bg-primary/5 text-xs flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Operação serializada: {queue.activeOperation ?? "na fila"}{queue.pendingCount ? ` · ${queue.pendingCount} pendente(s)` : ""}</span>
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={queue.cancelPendingActions}>Cancelar fila</Button>
        </Card>
      )}

      <NarrativeCorePanel project={project} />

      <Card className="p-2">
        <StageTimeline currentStage={project.current_stage} doneStages={doneStages} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <Tabs defaultValue="structure">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="structure">4. Estrutura</TabsTrigger>
              <TabsTrigger value="topics">5. Tópicos</TabsTrigger>
              <TabsTrigger value="script">6. Roteiro</TabsTrigger>
              <TabsTrigger value="critic">7. Crítica</TabsTrigger>
            </TabsList>

            {/* Estrutura */}
            <TabsContent value="structure" className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Arco narrativo</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => runAgent.mutate({ project, agent: "structurer", stage: 4 })}
                    disabled={runAgent.isPending || queue.isBusy}
                  >
                    {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                    {structureBlocks.length ? "Refinar etapa" : "Gerar"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!structureBlocks.length && (
                    <p className="text-xs text-muted-foreground">
                      Gere a estrutura — depois edite cada bloco diretamente, peça alternativas ou refine por tom.
                    </p>
                  )}
                  {structureBlocks.map((b, i) => (
                    <EditableBlock
                      key={b.id}
                      project={project}
                      stage={4}
                      collectionKey="blocks"
                      block={b as any}
                      textField="main_idea"
                      index={i}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tópicos */}
            <TabsContent value="topics" className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Tópicos de gravação</CardTitle>
                  <Button
                    size="sm"
                    disabled={!structureBlocks.length || runAgent.isPending || queue.isBusy}
                    onClick={() =>
                      runAgent.mutate({ project, agent: "topic-writer", stage: 5, payload: { blocks: structureBlocks } })
                    }
                  >
                    {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                    {topicsList.length ? "Refinar etapa" : "Gerar"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!structureBlocks.length && <p className="text-xs text-muted-foreground">Gere a estrutura antes.</p>}
                  {topicsList.map((t, i) => (
                    <EditableBlock
                      key={t.id}
                      project={project}
                      stage={5}
                      collectionKey="topics"
                      block={t as any}
                      textField="strong_phrase"
                      index={i}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roteiro */}
            <TabsContent value="script" className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Roteiro final</CardTitle>
                  <Button
                    size="sm"
                    disabled={!topicsList.length || runAgent.isPending || queue.isBusy}
                    onClick={() =>
                      runAgent.mutate({ project, agent: "script-writer", stage: 6, payload: { topics: topicsList } })
                    }
                  >
                    {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                    {scriptParagraphs.length ? "Refinar roteiro" : "Gerar"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!topicsList.length && <p className="text-xs text-muted-foreground">Gere os tópicos antes.</p>}
                  {scriptParagraphs.length > 0 && (
                    <ScriptHeader paragraphs={scriptParagraphs} />
                  )}
                  {scriptParagraphs.map((p, i) => (
                    <EditableBlock
                      key={p.id}
                      project={project}
                      stage={6}
                      collectionKey="paragraphs"
                      block={p as any}
                      textField="text"
                      index={i}
                      annotations={annotationsByBlock[p.id] ?? []}
                    />
                  ))}
                  {scriptParagraphs.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTeleprompterOpen(true)}
                      >
                        Modo gravação
                      </Button>
                      <ExportControls paragraphs={scriptParagraphs as any} annotations={inlineAnnotations} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Crítica */}
            <TabsContent value="critic" className="space-y-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Revisão crítica</CardTitle>
                  <Button
                    size="sm"
                    disabled={!scriptParagraphs.length || runAgent.isPending || queue.isBusy}
                    onClick={() =>
                      runAgent.mutate({ project, agent: "script-critic", stage: 7, payload: { paragraphs: scriptParagraphs } })
                    }
                  >
                    {runAgent.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Analisar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!scriptParagraphs.length || inlineCritique.isPending || queue.isBusy}
                    onClick={() => inlineCritique.mutate(
                      { project, blocks: scriptParagraphs.map((p: any) => ({ id: p.id, role: p.role, text: p.text ?? "" })) },
                      { onSuccess: (data: any) => setInlineAnnotations(data?.annotations ?? []) },
                    )}
                  >
                    {inlineCritique.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                    Revisão inline
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!scriptParagraphs.length && <p className="text-xs text-muted-foreground">Gere o roteiro antes.</p>}
                  {critic && (
                    <>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Score {critic.overall_score}/100</Badge>
                        <Badge>Retenção: {critic.retention_estimate}</Badge>
                      </div>
                      {critic.diagnostics?.map((d: any, i: number) => (
                        <div key={i} className="border rounded-md p-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={d.severity === "high" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {d.severity}
                            </Badge>
                            <span className="text-xs font-medium">{d.type}</span>
                            <span className="text-[11px] text-muted-foreground">· {d.paragraph_role}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{d.reason}</p>
                          <p className="text-xs"><span className="font-medium">Sugestão:</span> {d.suggestion}</p>
                        </div>
                      ))}
                      {critic.alternatives && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                          <div>
                            <p className="text-xs font-semibold mb-1">Hooks alternativos</p>
                            <ul className="text-xs space-y-1 list-disc pl-4">
                              {critic.alternatives.hooks?.map((h: string, i: number) => <li key={i}>{h}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1">CTAs alternativos</p>
                            <ul className="text-xs space-y-1 list-disc pl-4">
                              {critic.alternatives.ctas?.map((h: string, i: number) => <li key={i}>{h}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3">
          <ProjectMemorySidebar project={project} />
          <EvolutionLog project={project} />
        </div>
      </div>
    </div>
  );
}

function ScriptHeader({ paragraphs }: { paragraphs: any[] }) {
  const blocks = paragraphs.map((p: any) => ({ text: p.text ?? "", role: p.role, target_seconds: p.target_seconds }));
  const total = totalSeconds(blocks);
  const alerts = retentionRisk(blocks);
  return (
    <>
      <div className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Total estimado: <strong>{formatDuration(total)}</strong>
        </span>
      </div>
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2 rounded text-xs border ${
                a.severity === "danger"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : a.severity === "warn"
                  ? "border-yellow-500/40 bg-yellow-500/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <AlertTriangle className="h-3 w-3 mt-0.5" /> {a.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
