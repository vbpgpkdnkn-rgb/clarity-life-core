import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BarChart3,
  Brain,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clapperboard,
  Eye,
  Hammer,
  Lightbulb,
  MessageCircle,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { StoriesTab } from "@/components/conteudo/StoriesTab";
import { IntelligenceTab } from "@/components/conteudo/IntelligenceTab";
import { GrowthTab } from "@/components/conteudo/GrowthTab";
import { RelationalEngineTab, RelationalSeed } from "@/components/conteudo/RelationalEngineTab";
import { FloatingIdeaCapture, IdeasTab } from "@/components/conteudo/IdeasTab";
import { AudienceIntelligenceTab } from "@/components/conteudo/AudienceIntelligenceTab";
import { ContentPipelineTab } from "@/components/conteudo/ContentPipelineTab";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  currentWeekStart,
  dayISOFromWeekday,
  useEditorialLine,
  useGenerateEditorialLine,
  type EditorialDay,
} from "@/hooks/useEditorialLine";
import {
  ContentFormat,
  ContentPiece,
  ContentStatus,
  CTA_TYPES,
  useContentIdeas,
  useContentMetrics,
  useContentPieces,
  useContentWeeklyPlan,
  useContentConsistency,
  useDeletePiece,
  useGenerateTasksForPiece,
  useUpsertIdea,
  useUpsertMetric,
  useUpsertPiece,
} from "@/hooks/useContent";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR, addDaysISO } from "@/lib/format";
import { toast } from "sonner";
import { useDistribuicaoSemana } from "@/hooks/useDistribuicaoSemana";
import { StatusEstrategicoCard, EnergiaBadge } from "@/components/conteudo/EnergiaUI";
import { ENERGIA_META, type Energia } from "@/lib/energia";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";


const FORMATS: ContentFormat[] = ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"];
type PipelineStage = "roteiro_pronto" | "gravando" | "editando" | "pronto_postar" | "agendado" | "publicado";

const PIPELINE: { key: PipelineStage; label: string; status: ContentStatus }[] = [
  { key: "roteiro_pronto", label: "Roteiro pronto", status: "em_producao" },
  { key: "gravando", label: "Gravando", status: "em_producao" },
  { key: "editando", label: "Editando", status: "em_producao" },
  { key: "pronto_postar", label: "Pronto para postar", status: "pronto" },
  { key: "agendado", label: "Agendado", status: "pronto" },
  { key: "publicado", label: "Publicado", status: "publicado" },
];

const STAGE_LABEL = Object.fromEntries(PIPELINE.map((p) => [p.key, p.label])) as Record<PipelineStage, string>;
const FORMAT_MAP: Record<string, ContentFormat> = { reel: "reels", carrossel: "carrossel", legenda: "texto" };
const PILLAR_META: Record<string, { label: string; energia_natural: Energia; objetivo: string; descricao: string }> = {
  padrao_relacional: { label: "Padrão relacional", energia_natural: "topo", objetivo: "Identificação", descricao: "Ciclos invisíveis que o casal cria junto sem perceber" },
  funcao_emocional: { label: "Função emocional", energia_natural: "topo", objetivo: "Conectar", descricao: "O que os comportamentos estão servindo emocionalmente" },
  transformacao: { label: "Transformação estruturada", energia_natural: "meio", objetivo: "Ensinar", descricao: "Como a mudança relacional acontece — com direção" },
  qualidade_relacional: { label: "Qualidade relacional", energia_natural: "meio", objetivo: "Autoridade", descricao: "O que um relacionamento próspero realmente parece" },
  processo_terapeutico: { label: "Processo terapêutico", energia_natural: "fundo", objetivo: "Atrair paciente", descricao: "Como é trabalhar isso em sessão — sua vivência clínica" },
  descanso: { label: "Descanso", energia_natural: "topo", objetivo: "Conexão leve", descricao: "Bastidor, leveza, humanização" },
};
const PILLAR_LABEL: Record<string, string> = Object.fromEntries(Object.entries(PILLAR_META).map(([k, v]) => [k, v.label]));
const EDITORIAL_OBJECTIVE_LABEL: Record<string, string> = {
  identificacao: "Identificação",
  autoridade: "Autoridade",
  atrair_paciente: "Atrair paciente",
  ensinar: "Ensinar",
  descanso: "Descanso",
};
const WEEKDAY_LABEL: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

export default function Conteudo() {
  const { scope } = useScope();
  const { data: ideasAll = [] } = useContentIdeas();
  const { data: piecesAll = [] } = useContentPieces();
  const { data: metricsAll = [] } = useContentMetrics();
  const [tab, setTab] = useState("audiencia");
  const [seed, setSeed] = useState<RelationalSeed | null>(null);
  const [pipelineSeedId, setPipelineSeedId] = useState<string | null>(null);
  const upsertIdea = useUpsertIdea();

  const ideas = useMemo(() => filterByScope(ideasAll as any, scope), [ideasAll, scope]);
  const pieces = useMemo(() => filterByScope(piecesAll as any, scope), [piecesAll, scope]) as ContentPiece[];
  const metrics = metricsAll as any[];
  const consistency = useContentConsistency(scope === "todos" ? undefined : (scope as any));

  const pipelineNow = pieces.filter((p) => (p as any).pipeline_stage !== "publicado" && p.status !== "publicado" && p.status !== "arquivado").length;
  const ready = pieces.filter((p) => (p as any).pipeline_stage === "pronto_postar" || p.status === "pronto").length;
  const best = [...pieces]
    .filter((p) => p.status === "publicado")
    .sort((a: any, b: any) => ((b.saves ?? 0) + (b.generated_dms ?? 0)) - ((a.saves ?? 0) + (a.generated_dms ?? 0)))[0];

  const sendIdeaToMotor = (nextSeed: RelationalSeed) => {
    setSeed({
      ...nextSeed,
      onScriptReady: () => {
        if (nextSeed.ideaId) upsertIdea.mutate({ id: nextSeed.ideaId, title: nextSeed.sourceLabel ?? nextSeed.theme, idea_status: "roteiro_pronto", used: true } as any);
      },
    });
    setTab("motor");
    toast.success("Ideia enviada para o Motor Relacional");
  };

  const distrib = useDistribuicaoSemana();

  const criarComEnergia = (energia: Energia) => {
    setSeed({ theme: "", energia });
    setTab("motor");
    toast.success(`Vamos criar um conteúdo de ${ENERGIA_META[energia].curto}`);
  };

  return (
    <AppLayout title="Conteúdo" subtitle="Sistema editorial clínico para relacionamento e terapia de casal">
      <div className="mb-4">
        <StatusEstrategicoCard
          distrib={distrib}
          onCriar={criarComEnergia}
          onVerEditorial={() => setTab("editorial")}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Consistência semanal</div>
          <div className="text-2xl font-display font-semibold">{consistency.pct}%</div>
          <Progress value={consistency.pct} className="h-1.5 mt-2" />
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">No pipeline agora</div>
          <div className="text-2xl font-display font-semibold">{pipelineNow}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Prontas para postar</div>
          <div className="text-2xl font-display font-semibold">{ready}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Melhor conteúdo do mês</div>
          <div className="text-sm font-display font-semibold line-clamp-2">{best?.title ?? "Sem dados ainda"}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto md:flex-wrap">
          <TabsTrigger value="audiencia"><Brain className="h-3.5 w-3.5 mr-1" />Inteligência de Audiência</TabsTrigger>
          <TabsTrigger value="ideias"><Lightbulb className="h-3.5 w-3.5 mr-1" />Ideias</TabsTrigger>
          <TabsTrigger value="motor"><MessageCircle className="h-3.5 w-3.5 mr-1" />Motor Relacional</TabsTrigger>
          <TabsTrigger value="esteira"><Sparkles className="h-3.5 w-3.5 mr-1" />Esteira</TabsTrigger>
          <TabsTrigger value="pipeline"><Hammer className="h-3.5 w-3.5 mr-1" />Pipeline</TabsTrigger>
          <TabsTrigger value="editorial"><CalendarDays className="h-3.5 w-3.5 mr-1" />Editorial</TabsTrigger>
          <TabsTrigger value="crescimento"><TrendingUp className="h-3.5 w-3.5 mr-1" />Crescimento</TabsTrigger>
        </TabsList>

        <TabsContent value="audiencia"><AudienceIntelligenceTab onDevelop={sendIdeaToMotor} /></TabsContent>
        <TabsContent value="ideias"><IdeasTab onDevelop={sendIdeaToMotor} onOpenAudience={() => setTab("audiencia")} /></TabsContent>
        <TabsContent value="motor">
          <RelationalEngineTab
            seed={seed}
            onSendToPipeline={(projectId) => { setPipelineSeedId(projectId); setTab("esteira"); }}
          />
        </TabsContent>
        <TabsContent value="esteira">
          <ErrorBoundary scope="Esteira de conteúdo">
            <ContentPipelineTab initialProjectId={pipelineSeedId} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="pipeline"><PipelineTab pieces={pieces} metrics={metrics} /></TabsContent>
        <TabsContent value="editorial"><EditorialTab pieces={pieces} ideas={ideas as any} consistency={consistency} /></TabsContent>
        <TabsContent value="crescimento"><GrowthPerformanceTab pieces={pieces} metrics={metrics} /></TabsContent>
      </Tabs>
      <FloatingIdeaCapture />
    </AppLayout>
  );
}



function PipelineTab({ pieces, metrics }: { pieces: ContentPiece[]; metrics: any[] }) {
  const [editPiece, setEditPiece] = useState<ContentPiece | null>(null);
  const [publishTarget, setPublishTarget] = useState<ContentPiece | null>(null);
  const upsert = useUpsertPiece();
  const today = todayISO();
  const weekPublished = pieces.filter((p) => p.published_at && p.published_at >= addDaysISO(today, -7)).length;
  const distrib = useDistribuicaoSemana();

  const advance = (p: ContentPiece) => {
    const current = ((p as any).pipeline_stage ?? (p.status === "publicado" ? "publicado" : p.status === "pronto" ? "pronto_postar" : "roteiro_pronto")) as PipelineStage;
    const idx = PIPELINE.findIndex((x) => x.key === current);
    const next = PIPELINE[Math.min(idx + 1, PIPELINE.length - 1)];
    // Se for publicar, abre checklist primeiro
    if (next.key === "publicado") {
      setPublishTarget(p);
      return;
    }
    upsert.mutate({ id: p.id, title: p.title, pipeline_stage: next.key, status: next.status } as any);
  };

  const confirmPublish = (p: ContentPiece) => {
    upsert.mutate({ id: p.id, title: p.title, pipeline_stage: "publicado", status: "publicado", published_at: todayISO() } as any);
    setPublishTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Peças no pipeline hoje" value={pieces.filter((p) => p.status !== "publicado" && p.status !== "arquivado").length} />
        <MiniStat label="Prontas para postar" value={pieces.filter((p: any) => p.pipeline_stage === "pronto_postar" || p.status === "pronto").length} />
        <MiniStat label="Publicadas esta semana" value={weekPublished} />
        <MiniStat label="Consistência do mês" value={`${Math.min(100, Math.round((weekPublished / 3) * 100))}%`} />
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Distribuição estratégica desta semana</div>
          <div className="flex items-center gap-3 text-xs">
            {(["topo", "meio", "fundo"] as Energia[]).map((e) => {
              const meta = ENERGIA_META[e];
              const c = distrib.contagem[e];
              const a = distrib.alvo[e];
              return (
                <span key={e} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="uppercase tracking-wider text-[10px] text-muted-foreground">{e}</span>
                  <span className={c >= a ? "font-semibold" : ""}>{c}/{a}</span>
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {PIPELINE.map((col) => {
          const list = pieces.filter((p: any) => (p.pipeline_stage ?? (p.status === "publicado" ? "publicado" : p.status === "pronto" ? "pronto_postar" : "roteiro_pronto")) === col.key);
          return (
            <Card key={col.key} className="p-3 min-h-[220px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide">{col.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((p: any) => (
                  <Card key={p.id} className="p-3 bg-muted/20 border-border">
                    <button onClick={() => setEditPiece(p)} className="w-full text-left">
                      <div className="text-sm font-medium leading-snug">{p.title}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <EnergiaBadge energia={p.energia} />
                        <Badge variant="outline" className="text-[9px]">{p.format}</Badge>
                        {p.clinical_anchor && <Badge variant="outline" className="text-[9px]">{p.clinical_anchor}</Badge>}
                        {p.planned_date && <Badge variant="secondary" className="text-[9px]">{formatDateBR(p.planned_date)}</Badge>}
                      </div>
                      {p.script && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{p.script}</p>}
                    </button>
                    {col.key !== "publicado" ? (
                      <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => advance(p)}>Avançar etapa</Button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 mt-3 text-[10px] text-muted-foreground">
                        <span>Views {metrics.find((m) => m.piece_id === p.id)?.views ?? 0}</span>
                        <span>Salvos {p.saves ?? 0}</span>
                        <span>DMs {p.generated_dms ?? 0}</span>
                        <span>Agend. {p.appointments_booked ?? (p.booked_appointment ? 1 : 0)}</span>
                      </div>
                    )}
                  </Card>
                ))}
                {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">vazio</p>}
              </div>
            </Card>
          );
        })}
      </div>
      {editPiece && <PieceDrawer piece={editPiece} open={!!editPiece} onClose={() => setEditPiece(null)} />}
      {publishTarget && <PublishChecklistDialog piece={publishTarget} onCancel={() => setPublishTarget(null)} onConfirm={() => confirmPublish(publishTarget)} />}
    </div>
  );
}

function PublishChecklistDialog({ piece, onCancel, onConfirm }: { piece: ContentPiece; onCancel: () => void; onConfirm: () => void }) {
  const energia = (piece as any).energia as Energia | null;
  const meta = energia ? ENERGIA_META[energia] : null;
  const items = meta?.checklist ?? [
    "Roteiro revisado",
    "Gancho funciona nos 3 primeiros segundos",
    "CTA ou direção clara",
    "Sem jargão exposto",
  ];
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const allDone = checked.every(Boolean);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Antes de publicar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {meta ? (
            <p className="text-xs text-muted-foreground">
              Conteúdo de <strong className="text-foreground">{meta.curto}</strong>. Verifique se ele cumpre seu papel estratégico:
            </p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esta peça não tem energia estratégica definida. Considere classificá-la antes de publicar.
            </p>
          )}
          <div className="space-y-2">
            {items.map((it, i) => (
              <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(v) => setChecked((arr) => arr.map((c, idx) => idx === i ? !!v : c))}
                  className="mt-0.5"
                />
                <span>{it}</span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={!allDone}>Confirmar publicação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function EditorialTab({ pieces, ideas, consistency }: { pieces: ContentPiece[]; ideas: any[]; consistency: ReturnType<typeof useContentConsistency> }) {
  const weeklyPlan = useContentWeeklyPlan();
  const upsert = useUpsertPiece();
  const [editPiece, setEditPiece] = useState<ContentPiece | null>(null);
  const [focus, setFocus] = useState("");
  const today = todayISO();
  const weekStart = currentWeekStart();
  const line = useEditorialLine(weekStart);
  const generateLine = useGenerateEditorialLine();
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i - 3));
  const schedulable = pieces.filter((p: any) => p.status !== "publicado" && p.status !== "arquivado" && !p.planned_date);

  const schedule = (id: string, date: string) => {
    const p = pieces.find((x) => x.id === id);
    if (!p) return;
    upsert.mutate({ id, title: p.title, planned_date: date, pipeline_stage: "agendado", status: "pronto" } as any);
  };

  // Mantido por compatibilidade — não mais chamado pelo botão (substituído por drawer de cocriação)
  const createFromEditorialDay = (day: EditorialDay) => {
    const plannedDate = dayISOFromWeekday(weekStart, day.weekday);
    upsert.mutate({
      title: day.suggestion,
      theme: PILLAR_LABEL[day.pillar] ?? day.pillar,
      format: FORMAT_MAP[day.format] ?? (day.format === "stories" ? "stories" : "texto"),
      status: "pronto",
      pipeline_stage: "agendado",
      planned_date: plannedDate,
      clinical_anchor: day.pillar === "descanso" ? null : PILLAR_LABEL[day.pillar] ?? day.pillar,
      notes: `${PILLAR_LABEL[day.pillar] ?? day.pillar} · ${EDITORIAL_OBJECTIVE_LABEL[day.objective] ?? day.objective}`,
      scope: "profissional",
    } as any);
  };
  void createFromEditorialDay;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold">Plano semanal editorial</h3>
            <p className="text-xs text-muted-foreground">Distribuição por pilares: padrão relacional, função emocional, transformação e qualidade relacional.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Foco da semana" className="h-9 w-48" />
            <Button size="sm" variant="outline" onClick={() => generateLine.mutate({
              week_start: weekStart,
              focus,
              recent_titles: pieces.filter((p) => p.status === "publicado").slice(0, 12).map((p) => p.title),
            })} disabled={generateLine.isPending}>
              <CalendarCheck className="h-3.5 w-3.5 mr-1" />{generateLine.isPending ? "Gerando…" : "Gerar linha V5"}
            </Button>
            <Button size="sm" onClick={() => weeklyPlan.mutate({
            target_per_week: consistency.targetPerWeek,
            consistency_pct: consistency.pct,
            briefing: "Distribua formatos e temas pelos pilares: Padrão relacional, Função emocional, Transformação, Qualidade relacional.",
            pieces: pieces.map((p) => ({ id: p.id, title: p.title, status: p.status, format: p.format, planned_date: p.planned_date, theme: p.theme })),
            ideas: ideas.slice(0, 20).map((i) => ({ id: i.id, title: i.title, theme: i.theme, suggested_format: i.suggested_format })),
          })} disabled={weeklyPlan.isPending}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />{weeklyPlan.isPending ? "Gerando…" : "Gerar plano semanal com IA"}
            </Button>
          </div>
        </div>
        {line.data?.plan?.days && (
          <div className="mt-4 grid gap-2 md:grid-cols-7 border-t border-border pt-3">
            {line.data.plan.days.map((day) => {
              const date = dayISOFromWeekday(weekStart, day.weekday);
              const filled = pieces.some((p) => p.planned_date === date || (p as any).target_publish_at?.startsWith(date));
              return (
                <Card key={day.weekday} className={`p-2 space-y-2 ${filled ? "border-success/30" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{WEEKDAY_LABEL[day.weekday]}</span>
                    {filled ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="text-xs font-medium leading-snug line-clamp-3">{day.suggestion}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{PILLAR_LABEL[day.pillar]}</Badge>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{day.format}</Badge>
                  </div>
                  {!filled && day.format !== "descanso" && (
                    <Button size="sm" variant="ghost" className="h-7 w-full text-[11px]" onClick={() => createFromEditorialDay(day)}>Criar slot</Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        {weeklyPlan.data && <div className="mt-4 space-y-2 border-t border-border pt-3">{weeklyPlan.data.plan.schedule.map((s, i) => <div key={i} className="text-sm border border-border rounded-md p-2"><strong>{s.day}: {s.title}</strong><p className="text-xs text-muted-foreground">{s.reason}</p></div>)}</div>}
      </Card>

      {schedulable.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Arraste para uma data</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {schedulable.map((p) => <div key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("piece", p.id)} className="min-w-48 cursor-grab rounded-md border border-border bg-card p-2 text-sm"><div className="font-medium line-clamp-2">{p.title}</div><Badge variant="outline" className="text-[9px] mt-1">{p.format}</Badge></div>)}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const items = pieces.filter((p) => p.planned_date === d || (p as any).target_publish_at?.startsWith(d));
          return (
            <Card key={d} onDragOver={(e) => e.preventDefault()} onDrop={(e) => schedule(e.dataTransfer.getData("piece"), d)} className={`p-2 min-h-[130px] ${d === today ? "border-accent/50 bg-accent/5" : ""}`}>
              <div className="text-[10px] text-muted-foreground mb-2">{formatDateBR(d)}</div>
              <div className="space-y-1.5">{items.map((p) => <button key={p.id} onClick={() => setEditPiece(p)} className="block w-full text-left text-[11px] p-1.5 rounded bg-card border border-border"><div className="font-medium line-clamp-2">{p.title}</div><Badge className="mt-1 text-[9px] px-1 py-0">{STAGE_LABEL[((p as any).pipeline_stage ?? "agendado") as PipelineStage] ?? p.status}</Badge></button>)}</div>
            </Card>
          );
        })}
      </div>
      {editPiece && <PieceDrawer piece={editPiece} open={!!editPiece} onClose={() => setEditPiece(null)} />}
    </div>
  );
}

function GrowthPerformanceTab({ pieces, metrics }: { pieces: ContentPiece[]; metrics: any[] }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 border-accent/30 bg-accent/5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /><p className="text-sm font-medium">Integração com Meta API — em breve. Dados inseridos manualmente por enquanto.</p></div>
      </Card>
      <CollapseBlock title="Stories" icon={<Clapperboard className="h-4 w-4" />}><StoriesTab /></CollapseBlock>
      <CollapseBlock title="Performance" icon={<BarChart3 className="h-4 w-4" />}><PerformancePanel pieces={pieces} metrics={metrics} /></CollapseBlock>
      <CollapseBlock title="Inteligência" icon={<Brain className="h-4 w-4" />}><IntelligenceTab pieces={pieces} metrics={metrics} /><GrowthTab /></CollapseBlock>
    </div>
  );
}

function PerformancePanel({ pieces, metrics }: { pieces: ContentPiece[]; metrics: any[] }) {
  const upsertMetric = useUpsertMetric();
  const upsertPiece = useUpsertPiece();
  const published = pieces.filter((p) => p.status === "publicado" || (p as any).pipeline_stage === "publicado");
  const [editing, setEditing] = useState<any | null>(null);

  return <div className="space-y-3">
    {published.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Quando uma peça for publicada, registre os dados aqui.</Card>}
    {published.map((p: any) => {
      const m = metrics.find((x) => x.piece_id === p.id);
      return <Card key={p.id} className="p-4 flex items-center justify-between gap-3"><div><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground">{p.format} · {p.published_at ? formatDateBR(p.published_at) : "publicado"}</div></div><div className="grid grid-cols-5 gap-2 text-center flex-1 max-w-xl"><MiniStat label="Views" value={m?.views ?? 0} /><MiniStat label="Alcance" value={m?.reach ?? 0} /><MiniStat label="Salvos" value={p.saves ?? m?.saves ?? 0} /><MiniStat label="DMs" value={p.generated_dms ?? 0} /><MiniStat label="Agend." value={p.appointments_booked ?? 0} /></div><Button size="sm" variant="outline" onClick={() => setEditing({ piece_id: p.id, views: m?.views ?? "", reach: m?.reach ?? "", saves: p.saves ?? "", generated_dms: p.generated_dms ?? "", appointments_booked: p.appointments_booked ?? "" })}>Editar</Button></Card>;
    })}
    {editing && <Drawer open onOpenChange={() => setEditing(null)}><DrawerContent><DrawerHeader><DrawerTitle>Métricas do conteúdo</DrawerTitle></DrawerHeader><div className="px-4 grid gap-3 md:grid-cols-2">{["views", "reach", "saves", "generated_dms", "appointments_booked"].map((k) => <div key={k}><Label>{k}</Label><Input type="number" value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></div>)}</div><DrawerFooter><Button onClick={() => { upsertMetric.mutate({ piece_id: editing.piece_id, views: Number(editing.views) || 0, reach: Number(editing.reach) || 0, saves: Number(editing.saves) || 0 } as any); const p = pieces.find((x) => x.id === editing.piece_id); if (p) upsertPiece.mutate({ id: p.id, title: p.title, saves: Number(editing.saves) || 0, generated_dms: Number(editing.generated_dms) || 0, appointments_booked: Number(editing.appointments_booked) || 0 } as any); setEditing(null); }}>Salvar</Button></DrawerFooter></DrawerContent></Drawer>}
  </div>;
}

function PieceDrawer({ piece, open, onClose }: { piece: ContentPiece; open: boolean; onClose: () => void }) {
  const upsert = useUpsertPiece();
  const del = useDeletePiece();
  const genTasks = useGenerateTasksForPiece();
  const [form, setForm] = useState<any>({
    title: piece.title ?? "",
    theme: piece.theme ?? "",
    format: piece.format ?? "reels",
    pipeline_stage: (piece as any).pipeline_stage ?? "roteiro_pronto",
    status: piece.status ?? "em_producao",
    planned_date: piece.planned_date ?? "",
    clinical_anchor: (piece as any).clinical_anchor ?? "",
    script: piece.script ?? "",
    hook: piece.hook ?? "",
    cta: piece.cta ?? "",
    cta_type: (piece as any).cta_type ?? "",
    audience_context: (piece as any).audience_context ?? "",
    production_notes: (piece as any).production_notes ?? piece.notes ?? "",
    generated_dms: String((piece as any).generated_dms ?? ""),
    saves: String((piece as any).saves ?? ""),
    appointments_booked: String((piece as any).appointments_booked ?? ""),
  });

  const save = () => {
    const stage = PIPELINE.find((x) => x.key === form.pipeline_stage) ?? PIPELINE[0];
    upsert.mutate({
      id: piece.id,
      ...form,
      status: stage.status,
      planned_date: form.planned_date || null,
      notes: form.production_notes,
      generated_dms: Number(form.generated_dms) || 0,
      saves: Number(form.saves) || 0,
      appointments_booked: Number(form.appointments_booked) || 0,
    } as any, { onSuccess: onClose });
  };

  return <Drawer open={open} onOpenChange={(o) => !o && onClose()}><DrawerContent className="max-h-[92vh]"><DrawerHeader><DrawerTitle>Card de produção</DrawerTitle></DrawerHeader><div className="px-4 overflow-y-auto space-y-3">
    <div><Label>Título do conteúdo</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
    <div className="grid grid-cols-2 gap-2"><div><Label>Formato</Label><Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div><div><Label>Etapa</Label><Select value={form.pipeline_stage} onValueChange={(v) => setForm({ ...form, pipeline_stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PIPELINE.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="grid grid-cols-2 gap-2"><div><Label>Ancoragem clínica</Label><Input value={form.clinical_anchor} onChange={(e) => setForm({ ...form, clinical_anchor: e.target.value })} /></div><div><Label>Data alvo</Label><Input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div></div>
    <div><Label>Gancho</Label><Input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} /></div>
    <div><Label>Roteiro completo</Label><Textarea rows={7} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} /></div>
    <details className="rounded border border-border p-3"><summary className="cursor-pointer text-sm">Contexto da audiência</summary><Textarea rows={4} className="mt-2" value={form.audience_context} onChange={(e) => setForm({ ...form, audience_context: e.target.value })} /></details>
    <div><Label>Observações de produção</Label><Textarea rows={3} value={form.production_notes} onChange={(e) => setForm({ ...form, production_notes: e.target.value })} /></div>
    {form.pipeline_stage === "publicado" && <div className="grid grid-cols-3 gap-2 rounded border border-border p-3 bg-muted/20"><div><Label>Salvamentos</Label><Input type="number" value={form.saves} onChange={(e) => setForm({ ...form, saves: e.target.value })} /></div><div><Label>DMs</Label><Input type="number" value={form.generated_dms} onChange={(e) => setForm({ ...form, generated_dms: e.target.value })} /></div><div><Label>Agendamentos</Label><Input type="number" value={form.appointments_booked} onChange={(e) => setForm({ ...form, appointments_booked: e.target.value })} /></div></div>}
    <div className="grid grid-cols-2 gap-2"><div><Label>CTA</Label><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></div><div><Label>Tipo de CTA</Label><Select value={form.cta_type || "none"} onValueChange={(v) => setForm({ ...form, cta_type: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">— sem tipo —</SelectItem>{CTA_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div>
    <Button size="sm" variant="outline" onClick={() => genTasks.mutate(piece)} disabled={!form.planned_date || genTasks.isPending}>Gerar tarefas no Planner</Button>
  </div><DrawerFooter className="flex-row gap-2"><Button variant="ghost" className="text-destructive" onClick={() => { del.mutate(piece.id); onClose(); }}>Excluir</Button><div className="flex-1" /><Button onClick={save}>Salvar</Button></DrawerFooter></DrawerContent></Drawer>;
}

function CollapseBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Collapsible defaultOpen={title === "Stories"}><Card className="p-4"><CollapsibleTrigger className="flex w-full items-center justify-between"><span className="flex items-center gap-2 font-display font-semibold">{icon}{title}</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></CollapsibleTrigger><CollapsibleContent className="pt-4">{children}</CollapsibleContent></Card></Collapsible>;
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded border border-border p-2"><div className="text-[10px] text-muted-foreground">{label}</div><div className="font-display font-semibold">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</div></div>;
}
