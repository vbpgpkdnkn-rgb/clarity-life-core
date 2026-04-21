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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Lightbulb,
  CalendarDays,
  Hammer,
  Send,
  BarChart3,
  Library,
  Sparkles,
  Plus,
  Trash2,
  Wand2,
  CheckCircle2,
  Clock,
  ListChecks,
  Edit3,
  Clapperboard,
  Brain,
  Link2,
} from "lucide-react";
import { StoriesTab } from "@/components/conteudo/StoriesTab";
import { IntelligenceTab } from "@/components/conteudo/IntelligenceTab";
import { ReferencesTab } from "@/components/conteudo/ReferencesTab";
import { GrowthTab } from "@/components/conteudo/GrowthTab";
import {
  ContentFormat,
  ContentPiece,
  ContentStatus,
  CTA_TYPES,
  useContentIdeas,
  useContentIdeator,
  useContentMetrics,
  useContentPieces,
  useContentWeeklyPlan,
  useContentConsistency,
  useDeleteIdea,
  useDeletePiece,
  useGenerateTasksForPiece,
  useUpsertIdea,
  useUpsertMetric,
  useUpsertPiece,
} from "@/hooks/useContent";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { todayISO, formatDateBR, addDaysISO } from "@/lib/format";
import { toast } from "sonner";

const FORMATS: ContentFormat[] = ["reels", "carrossel", "texto", "stories", "video", "podcast", "newsletter"];
const STATUS_LABEL: Record<ContentStatus, string> = {
  ideia: "Ideia",
  em_producao: "Em produção",
  pronto: "Pronto",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
const STATUS_COLOR: Record<ContentStatus, string> = {
  ideia: "bg-muted text-muted-foreground",
  em_producao: "bg-warning/15 text-warning border-warning/30",
  pronto: "bg-primary/15 text-primary border-primary/30",
  publicado: "bg-success/15 text-success border-success/30",
  arquivado: "bg-muted text-muted-foreground",
};

export default function Conteudo() {
  const { scope } = useScope();
  const { data: ideasAll = [] } = useContentIdeas();
  const { data: piecesAll = [] } = useContentPieces();
  const { data: metricsAll = [] } = useContentMetrics();

  const ideas = useMemo(() => filterByScope(ideasAll as any, scope), [ideasAll, scope]);
  const pieces = useMemo(() => filterByScope(piecesAll as any, scope), [piecesAll, scope]) as ContentPiece[];

  const consistency = useContentConsistency(scope === "todos" ? undefined : (scope as any));

  return (
    <AppLayout title="Conteúdo" subtitle="Sua máquina editorial — direta, sem desculpas">
      {/* HEADER stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Consistência semanal</div>
          <div className="text-2xl font-display font-semibold">{consistency.pct}%</div>
          <Progress value={consistency.pct} className="h-1.5 mt-2" />
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Publicados na semana</div>
          <div className="text-2xl font-display font-semibold">
            {consistency.publishedCount}
            <span className="text-base text-muted-foreground font-normal"> / {consistency.targetPerWeek}</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Em produção</div>
          <div className="text-2xl font-display font-semibold">
            {pieces.filter((p) => p.status === "em_producao").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Ideias no banco</div>
          <div className="text-2xl font-display font-semibold">{ideas.length}</div>
        </Card>
      </div>

      <Tabs defaultValue="ideias" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="ideias"><Lightbulb className="h-3.5 w-3.5 mr-1" />Ideias</TabsTrigger>
          <TabsTrigger value="editorial"><CalendarDays className="h-3.5 w-3.5 mr-1" />Editorial</TabsTrigger>
          <TabsTrigger value="producao"><Hammer className="h-3.5 w-3.5 mr-1" />Produção</TabsTrigger>
          <TabsTrigger value="stories"><Clapperboard className="h-3.5 w-3.5 mr-1" />Stories</TabsTrigger>
          <TabsTrigger value="publicacao"><Send className="h-3.5 w-3.5 mr-1" />Publicação</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="h-3.5 w-3.5 mr-1" />Performance</TabsTrigger>
          <TabsTrigger value="inteligencia"><Brain className="h-3.5 w-3.5 mr-1" />Inteligência</TabsTrigger>
          <TabsTrigger value="referencias"><Link2 className="h-3.5 w-3.5 mr-1" />Referências</TabsTrigger>
          <TabsTrigger value="biblioteca"><Library className="h-3.5 w-3.5 mr-1" />Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="ideias"><IdeasTab ideas={ideas as any} /></TabsContent>
        <TabsContent value="editorial"><EditorialTab pieces={pieces} ideas={ideas as any} consistency={consistency} /></TabsContent>
        <TabsContent value="producao"><ProductionTab pieces={pieces} /></TabsContent>
        <TabsContent value="stories"><StoriesTab /></TabsContent>
        <TabsContent value="publicacao"><PublishTab pieces={pieces} /></TabsContent>
        <TabsContent value="performance"><PerformanceTab pieces={pieces} metrics={metricsAll as any} /></TabsContent>
        <TabsContent value="inteligencia"><IntelligenceTab pieces={pieces} metrics={metricsAll as any} /></TabsContent>
        <TabsContent value="referencias">
          <ReferencesTab ownThemes={Array.from(new Set(pieces.map((p) => p.theme).filter(Boolean) as string[]))} />
        </TabsContent>
        <TabsContent value="biblioteca"><LibraryTab pieces={pieces} /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ============== IDEIAS ============== */
function IdeasTab({ ideas }: { ideas: any[] }) {
  const upsert = useUpsertIdea();
  const del = useDeleteIdea();
  const ideator = useContentIdeator();
  const { scope } = useScope();
  const [newTitle, setNewTitle] = useState("");
  const [newTheme, setNewTheme] = useState("");

  const themes = Array.from(new Set(ideas.map((i) => i.theme).filter(Boolean)));

  const add = () => {
    if (!newTitle.trim()) return;
    upsert.mutate(
      { title: newTitle.trim(), theme: newTheme.trim() || null, scope: (scope === "todos" ? "profissional" : scope) as any },
      { onSuccess: () => { setNewTitle(""); setNewTheme(""); } },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Captura rápida: digite uma ideia…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1"
          />
          <Input
            placeholder="Tema (ansiedade, autoestima…)"
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            className="md:w-64"
          />
          <Button onClick={add} disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Capture sem editar. Edite depois.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              ideator.mutate(
                { area: "psicologia clínica e comportamento", scope, existing_themes: themes as string[] },
                {
                  onSuccess: (data) => {
                    data.suggestions.forEach((s) =>
                      upsert.mutate({
                        title: s.title,
                        theme: s.theme,
                        suggested_format: s.format,
                        notes: `Hook: ${s.hook}\n\nPor quê: ${s.rationale}`,
                        scope: (scope === "todos" ? "profissional" : scope) as any,
                        source: "IA",
                      }),
                    );
                    toast.success(`${data.suggestions.length} ideias geradas pela IA`);
                  },
                },
              )
            }
            disabled={ideator.isPending}
          >
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            {ideator.isPending ? "Gerando…" : "Sugerir com IA"}
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ideas.map((i) => (
          <Card key={i.id} className="p-4 group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-sm leading-snug">{i.title}</h3>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => del.mutate(i.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {i.theme && <Badge variant="secondary" className="text-[10px]">{i.theme}</Badge>}
              {i.suggested_format && <Badge variant="outline" className="text-[10px]">{i.suggested_format}</Badge>}
              {i.source === "IA" && <Badge className="text-[10px] bg-accent/15 text-accent border-accent/30">IA</Badge>}
              <Badge variant="outline" className="text-[10px]">{i.scope}</Badge>
            </div>
            {i.notes && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line line-clamp-3">{i.notes}</p>}
          </Card>
        ))}
        {ideas.length === 0 && (
          <Card className="p-8 col-span-full text-center text-sm text-muted-foreground">
            Nenhuma ideia ainda. Capture rápido ou peça sugestões à IA.
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============== EDITORIAL (calendar) ============== */
function EditorialTab({
  pieces,
  ideas,
  consistency,
}: {
  pieces: ContentPiece[];
  ideas: any[];
  consistency: ReturnType<typeof useContentConsistency>;
}) {
  const weeklyPlan = useContentWeeklyPlan();
  const [editPiece, setEditPiece] = useState<ContentPiece | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i - 3));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold">Plano semanal da IA</h3>
            <p className="text-xs text-muted-foreground">Diretora editorial: o que postar e quando.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nova peça
            </Button>
            <Button
              size="sm"
              onClick={() =>
                weeklyPlan.mutate({
                  target_per_week: consistency.targetPerWeek,
                  consistency_pct: consistency.pct,
                  pieces: pieces.map((p) => ({
                    id: p.id, title: p.title, status: p.status, format: p.format,
                    planned_date: p.planned_date, theme: p.theme,
                  })),
                  ideas: ideas.slice(0, 20).map((i) => ({
                    id: i.id, title: i.title, theme: i.theme, suggested_format: i.suggested_format,
                  })),
                })
              }
              disabled={weeklyPlan.isPending}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {weeklyPlan.isPending ? "Gerando…" : "Gerar plano"}
            </Button>
          </div>
        </div>
        {weeklyPlan.data && (
          <div className="mt-4 space-y-3 border-t border-border pt-3">
            <p className="text-sm">{weeklyPlan.data.plan.summary}</p>
            <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-accent mb-1">Hoje</div>
              <p className="text-sm font-medium">{weeklyPlan.data.plan.today_action}</p>
            </div>
            <div className="space-y-2">
              {weeklyPlan.data.plan.schedule.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border border-border rounded-md p-2">
                  <div>
                    <div className="font-medium">{s.day}: {s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.reason}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{s.format}</Badge>
                </div>
              ))}
            </div>
            {weeklyPlan.data.plan.adjustments.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong>Ajustes:</strong>
                <ul className="list-disc list-inside mt-1">
                  {weeklyPlan.data.plan.adjustments.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const items = pieces.filter((p) => p.planned_date === d);
          const isToday = d === today;
          return (
            <Card key={d} className={`p-2 min-h-[110px] ${isToday ? "border-accent/50 bg-accent/5" : ""}`}>
              <div className="text-[10px] text-muted-foreground mb-1">{formatDateBR(d)}</div>
              <div className="space-y-1">
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditPiece(p)}
                    className="block w-full text-left text-[11px] p-1.5 rounded bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="font-medium line-clamp-1">{p.title}</div>
                    <Badge className={`mt-0.5 text-[9px] ${STATUS_COLOR[p.status]} px-1 py-0`}>{p.format}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {(editPiece || creating) && (
        <PieceDrawer
          piece={editPiece}
          open={!!editPiece || creating}
          onClose={() => { setEditPiece(null); setCreating(false); }}
          ideas={ideas}
        />
      )}
    </div>
  );
}

/* ============== PRODUÇÃO ============== */
function ProductionTab({ pieces }: { pieces: ContentPiece[] }) {
  const cols: ContentStatus[] = ["ideia", "em_producao", "pronto"];
  const [editPiece, setEditPiece] = useState<ContentPiece | null>(null);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-3">
        {cols.map((status) => {
          const list = pieces.filter((p) => p.status === status);
          return (
            <Card key={status} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{STATUS_LABEL[status]}</h3>
                <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((p) => {
                  const checklist = (p.checklist as any[]) || [];
                  const doneCount = checklist.filter((c) => c.done).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEditPiece(p)}
                      className="block w-full text-left p-2 rounded border border-border hover:border-primary/50 bg-card"
                    >
                      <div className="text-sm font-medium line-clamp-2">{p.title}</div>
                      <div className="flex gap-1 mt-1.5 items-center flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{p.format}</Badge>
                        {p.planned_date && <span className="text-[10px] text-muted-foreground">{formatDateBR(p.planned_date)}</span>}
                        {checklist.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            <ListChecks className="h-3 w-3 inline mr-0.5" />{doneCount}/{checklist.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {list.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">vazio</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {editPiece && <PieceDrawer piece={editPiece} open={!!editPiece} onClose={() => setEditPiece(null)} ideas={[]} />}
    </>
  );
}

/* ============== PUBLICAÇÃO ============== */
function PublishTab({ pieces }: { pieces: ContentPiece[] }) {
  const upsert = useUpsertPiece();
  const ready = pieces.filter((p) => p.status === "pronto");
  return (
    <div className="space-y-3">
      {ready.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma peça pronta para publicar.
        </Card>
      )}
      {ready.map((p) => (
        <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-muted-foreground flex gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{p.format}</Badge>
              {p.planned_date && <span>Planejado: {formatDateBR(p.planned_date)}</span>}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() =>
              upsert.mutate({
                id: p.id, title: p.title,
                status: "publicado", published_at: todayISO(),
              })
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar publicado
          </Button>
        </Card>
      ))}
    </div>
  );
}

/* ============== PERFORMANCE ============== */
function PerformanceTab({ pieces, metrics }: { pieces: ContentPiece[]; metrics: any[] }) {
  const upsertMetric = useUpsertMetric();
  const published = pieces.filter((p) => p.status === "publicado");
  const [editing, setEditing] = useState<{ piece_id: string; views: string; likes: string; comments: string; reach: string } | null>(null);

  return (
    <div className="space-y-3">
      {published.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Publique peças para registrar performance.</Card>
      )}
      {published.map((p) => {
        const m = metrics.find((x) => x.piece_id === p.id);
        return (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.format} · publicado em {p.published_at ? formatDateBR(p.published_at) : "—"}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing({
                piece_id: p.id,
                views: String(m?.views ?? ""),
                likes: String(m?.likes ?? ""),
                comments: String(m?.comments ?? ""),
                reach: String(m?.reach ?? ""),
              })}>
                <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            </div>
            {m ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Views" value={m.views} />
                <Stat label="Likes" value={m.likes} />
                <Stat label="Coments" value={m.comments} />
                <Stat label="Alcance" value={m.reach} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem métricas registradas.</p>
            )}
          </Card>
        );
      })}
      {editing && (
        <Drawer open onOpenChange={() => setEditing(null)}>
          <DrawerContent>
            <DrawerHeader><DrawerTitle>Métricas</DrawerTitle></DrawerHeader>
            <div className="px-4 space-y-3">
              {(["views", "likes", "comments", "reach"] as const).map((k) => (
                <div key={k}>
                  <Label className="capitalize">{k}</Label>
                  <Input
                    type="number"
                    value={(editing as any)[k]}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <DrawerFooter>
              <Button onClick={() => {
                upsertMetric.mutate({
                  piece_id: editing.piece_id,
                  views: Number(editing.views) || 0,
                  likes: Number(editing.likes) || 0,
                  comments: Number(editing.comments) || 0,
                  reach: Number(editing.reach) || 0,
                });
                setEditing(null);
              }}>Salvar</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-display font-semibold">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

/* ============== BIBLIOTECA ============== */
function LibraryTab({ pieces }: { pieces: ContentPiece[] }) {
  const lib = pieces.filter((p) => p.status === "publicado" || p.status === "arquivado");
  const byTheme = lib.reduce<Record<string, ContentPiece[]>>((acc, p) => {
    const t = p.theme || "Sem tema";
    (acc[t] ||= []).push(p);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {Object.entries(byTheme).map(([theme, list]) => (
        <Card key={theme} className="p-4">
          <h3 className="font-display font-semibold mb-2">{theme} <span className="text-xs text-muted-foreground">({list.length})</span></h3>
          <div className="grid md:grid-cols-2 gap-2">
            {list.map((p) => (
              <div key={p.id} className="p-2 border border-border rounded text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.format} · {p.published_at ? formatDateBR(p.published_at) : "—"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      {lib.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Biblioteca vazia.</Card>}
    </div>
  );
}

/* ============== DRAWER editar/criar peça ============== */
function PieceDrawer({
  piece,
  open,
  onClose,
  ideas,
}: {
  piece: ContentPiece | null;
  open: boolean;
  onClose: () => void;
  ideas: any[];
}) {
  const upsert = useUpsertPiece();
  const del = useDeletePiece();
  const genTasks = useGenerateTasksForPiece();
  const { scope } = useScope();

  const [form, setForm] = useState({
    id: piece?.id,
    title: piece?.title ?? "",
    theme: piece?.theme ?? "",
    format: (piece?.format ?? "reels") as ContentFormat,
    status: (piece?.status ?? "ideia") as ContentStatus,
    planned_date: piece?.planned_date ?? "",
    script: piece?.script ?? "",
    hook: piece?.hook ?? "",
    cta: piece?.cta ?? "",
    notes: piece?.notes ?? "",
    priority: (piece?.priority ?? "media") as "alta" | "media" | "baixa",
    checklist: (piece?.checklist as any[]) ?? [],
  });

  const save = (generateTasks = false) => {
    if (!form.title.trim()) { toast.error("Dê um título"); return; }
    upsert.mutate(
      {
        ...form,
        planned_date: form.planned_date || null,
        scope: (piece?.scope ?? (scope === "todos" ? "profissional" : scope)) as any,
        generateTasks,
      } as any,
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{piece ? "Editar peça" : "Nova peça"}</DrawerTitle>
          <DrawerDescription>Roteiro, status, agenda e checklist.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 overflow-y-auto space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tema</Label>
              <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as ContentFormat })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ContentStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data planejada</Label>
              <Input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Hook</Label>
            <Input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} placeholder="Frase de abertura" />
          </div>
          <div>
            <Label>Roteiro</Label>
            <Textarea rows={6} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} />
          </div>
          <div>
            <Label>CTA</Label>
            <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
          </div>
          <div>
            <Label>Anotações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {piece && (
            <div className="rounded border border-border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Gerar tasks no Planner usando template do formato (roteiro/gravação/edição/publicação) com offsets antes da data.
              </p>
              <Button size="sm" variant="outline" onClick={() => genTasks.mutate(piece)} disabled={!form.planned_date || genTasks.isPending}>
                <ListChecks className="h-3.5 w-3.5 mr-1" /> Gerar tarefas
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter className="flex-row gap-2">
          {piece && (
            <Button variant="ghost" className="text-destructive" onClick={() => { del.mutate(piece.id); onClose(); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => save(false)}>Salvar</Button>
          <Button onClick={() => save(true)}>Salvar e gerar tarefas</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
