import { useMemo, useState } from "react";
import { Lightbulb, MoreHorizontal, Plus, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useScope, filterByScope } from "@/contexts/ScopeContext";
import { ContentIdea, ContentFormat, useContentIdeator, useContentIdeas, useUpsertIdea, useUpsertPiece } from "@/hooks/useContent";
import { RelationalSeed } from "@/components/conteudo/RelationalEngineTab";
import { toast } from "sonner";

type IdeaStatus = "nova" | "enriquecida" | "em_desenvolvimento" | "roteiro_pronto" | "arquivada";
type SortMode = "recentes" | "urgencia" | "tema";

const PLACEHOLDERS = [
  "O que está na sua cabeça agora?",
  "Qual padrão você viu hoje no consultório?",
  "Algum insight de sessão que pode virar conteúdo?",
  "Uma frase que ouviu ou pensou que vale guardar...",
];

const RELATIONAL_THEMES = [
  "o casal que convive mas não se conecta",
  "a briga que sempre volta",
  "quando um persegue e o outro foge",
  "o silêncio que virou distância",
  "dependência emocional",
  "stonewalling",
  "ciclo de polarização",
  "perda de amizade no relacionamento",
  "ciúme como rastreador de insegurança",
  "quando um carrega tudo",
];

const STATUS_LABEL: Record<IdeaStatus, string> = {
  nova: "Nova",
  enriquecida: "Enriquecida",
  em_desenvolvimento: "Em desenvolvimento",
  roteiro_pronto: "Roteiro pronto",
  arquivada: "Arquivada",
};

const FILTERS: { key: "todas" | IdeaStatus; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "nova", label: "Novas" },
  { key: "em_desenvolvimento", label: "Em desenvolvimento" },
  { key: "roteiro_pronto", label: "Prontas" },
  { key: "arquivada", label: "Arquivadas" },
];

function getStatus(idea: ContentIdea): IdeaStatus {
  return ((idea as any).idea_status ?? (idea.used ? "roteiro_pronto" : "nova")) as IdeaStatus;
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `Salva há ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Salva há ${hours}h`;
  return `Salva há ${Math.round(hours / 24)}d`;
}

function nextStatus(form: Partial<ContentIdea>): IdeaStatus {
  if ((form as any).idea_status === "arquivada") return "arquivada";
  return form.theme && (form as any).preferred_format && (form as any).clinical_anchor ? "enriquecida" : "nova";
}

function mapFormat(format?: string | null): "reel" | "carrossel" | "legenda" | undefined {
  if (format === "reels" || format === "reel") return "reel";
  if (format === "carrossel") return "carrossel";
  if (format === "texto" || format === "legenda") return "legenda";
  return undefined;
}

export function IdeasTab({ onDevelop, onOpenAudience }: { onDevelop: (seed: RelationalSeed, idea: ContentIdea) => void; onOpenAudience: () => void }) {
  const { scope } = useScope();
  const { data: ideasAll = [] } = useContentIdeas();
  const upsertIdea = useUpsertIdea();
  const ideator = useContentIdeator();
  const [quick, setQuick] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todas" | IdeaStatus>("todas");
  const [sort, setSort] = useState<SortMode>("recentes");
  const placeholder = useMemo(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)], []);
  const ideas = useMemo(() => filterByScope(ideasAll as any, scope) as ContentIdea[], [ideasAll, scope]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { todas: ideas.filter((i) => getStatus(i) !== "arquivada").length };
    for (const item of ideas) base[getStatus(item)] = (base[getStatus(item)] ?? 0) + 1;
    return base;
  }, [ideas]);

  const visibleIdeas = useMemo(() => {
    const filtered = ideas.filter((i) => (filter === "todas" ? getStatus(i) !== "arquivada" : getStatus(i) === filter));
    return [...filtered].sort((a, b) => {
      if (sort === "tema") return (a.theme ?? "").localeCompare(b.theme ?? "");
      if (sort === "urgencia") return urgencyRank((b as any).urgency) - urgencyRank((a as any).urgency);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [ideas, filter, sort]);

  const saveQuick = async (text = quick) => {
    const title = text.trim();
    if (!title) return;
    await upsertIdea.mutateAsync({ title, scope: (scope === "todos" ? "profissional" : scope) as any, source: "Captura rápida", idea_status: "nova", urgency: "sem_pressa" } as any);
    setQuick("");
  };

  const suggestIdeas = async () => {
    const data = await ideator.mutateAsync({
      area: "psicologia clínica de relacionamentos e terapia de casal",
      scope: "profissional",
      existing_themes: ideas.map((i) => i.theme ?? i.title).slice(0, 30),
      briefing: "Gere exatamente 5 ideias para mulheres 25-45 em crise ou ambivalência relacional. Base clínica: IBCT e Gottman. Evite temas genéricos.",
    });
    await Promise.all(data.suggestions.slice(0, 5).map((s) => upsertIdea.mutateAsync({
      title: s.title,
      theme: s.theme,
      suggested_format: s.format,
      preferred_format: s.format,
      notes: `${s.hook}\n\n${s.rationale}`,
      source: "IA · Ideias rápidas",
      scope: "profissional",
      idea_status: "enriquecida",
      urgency: "sem_pressa",
    } as any)));
    toast.success("5 ideias adicionadas ao banco");
  };

  return <div className="space-y-4">
    <Card className="sticky top-2 z-10 p-3 bg-card/95 backdrop-blur border-accent/20">
      <div className="flex gap-2 items-start">
        <Textarea
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveQuick(); } }}
          placeholder={placeholder}
          rows={1}
          className="min-h-10 resize-none text-base"
        />
        <Button onClick={() => saveQuick()} disabled={!quick.trim() || upsertIdea.isPending}>Salvar →</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={suggestIdeas} disabled={ideator.isPending || upsertIdea.isPending}><Sparkles className="h-3.5 w-3.5 mr-1" />{ideator.isPending ? "Sugerindo…" : "Sugerir ideias com IA"}</Button>
        <Button size="sm" variant="ghost" onClick={onOpenAudience}><Wand2 className="h-3.5 w-3.5 mr-1" />Analisar audiência</Button>
      </div>
    </Card>

    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)} className="shrink-0">{f.label} ({counts[f.key] ?? 0})</Button>)}
      </div>
      <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
        <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="recentes">Mais recentes primeiro</SelectItem>
          <SelectItem value="urgencia">Por urgência</SelectItem>
          <SelectItem value="tema">Por tema</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {visibleIdeas.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma ideia ainda. O que está na sua cabeça agora?</Card> : <div className="space-y-2">
      {visibleIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} open={expanded === idea.id} onOpen={() => setExpanded(expanded === idea.id ? null : idea.id)} onDevelop={onDevelop} />)}
    </div>}
  </div>;
}

function IdeaCard({ idea, open, onOpen, onDevelop }: { idea: ContentIdea; open: boolean; onOpen: () => void; onDevelop: (seed: RelationalSeed, idea: ContentIdea) => void }) {
  const upsertIdea = useUpsertIdea();
  const upsertPiece = useUpsertPiece();
  const [form, setForm] = useState<any>({ title: idea.title, theme: idea.theme ?? "", otherTheme: "", context: (idea as any).context ?? "", preferred_format: (idea as any).preferred_format ?? idea.suggested_format ?? "ia", clinical_anchor: (idea as any).clinical_anchor ?? "IBCT+Gottman", urgency: (idea as any).urgency ?? "sem_pressa" });
  const status = getStatus(idea);

  const saveEnrichment = () => upsertIdea.mutate({ id: idea.id, title: form.title, theme: form.theme === "outro" ? form.otherTheme : form.theme, context: form.context, preferred_format: form.preferred_format, suggested_format: form.preferred_format === "ia" ? null : form.preferred_format, clinical_anchor: form.clinical_anchor, urgency: form.urgency, idea_status: nextStatus({ theme: form.theme === "outro" ? form.otherTheme : form.theme, preferred_format: form.preferred_format, clinical_anchor: form.clinical_anchor } as any) } as any);
  const develop = () => {
    const chosenTheme = form.theme === "outro" ? form.otherTheme : form.theme;
    saveEnrichment();
    upsertIdea.mutate({ id: idea.id, title: form.title, idea_status: "em_desenvolvimento" } as any);
    onDevelop({ theme: chosenTheme || form.title, hook: form.title, anchor: form.clinical_anchor === "logica" ? "sem_nomear" : form.clinical_anchor, format: mapFormat(form.preferred_format), audienceContext: [form.title, form.context].filter(Boolean).join("\n\n"), ideaId: idea.id, sourceLabel: form.title.slice(0, 80) }, idea);
  };
  const sendEditorial = () => {
    const format = (form.preferred_format === "ia" ? "reels" : form.preferred_format) as ContentFormat;
    upsertPiece.mutate({ title: form.title, theme: form.theme === "outro" ? form.otherTheme : form.theme, format, status: "pronto", pipeline_stage: "agendado", idea_id: idea.id, clinical_anchor: form.clinical_anchor, audience_context: form.context || null, notes: form.title, scope: idea.scope } as any);
    upsertIdea.mutate({ id: idea.id, title: form.title, used: true, idea_status: "enriquecida" } as any);
  };
  const archive = () => upsertIdea.mutate({ id: idea.id, title: idea.title, idea_status: "arquivada", archived_at: new Date().toISOString() } as any);

  return <Card className="p-3 transition-colors hover:border-accent/40">
    <div className="flex items-start gap-3">
      <button onClick={onOpen} className="flex-1 text-left">
        <div className="flex items-start gap-2"><Lightbulb className="h-4 w-4 mt-0.5 text-accent shrink-0" /><p className="text-sm font-medium leading-snug">{idea.title}</p></div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span>{relativeTime(idea.created_at)}</span><Badge variant={status === "nova" ? "secondary" : "outline"} className="text-[10px]">{STATUS_LABEL[status]}</Badge></div>
      </button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={develop}>Desenvolver no Motor</DropdownMenuItem><DropdownMenuItem onClick={sendEditorial}>Enviar para Editorial</DropdownMenuItem><DropdownMenuItem onClick={archive}>Arquivar</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
    {open && <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div><Label>Ideia</Label><Textarea rows={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2" /></div>
      <div className="grid gap-3 md:grid-cols-2"><div><Label>Tema relacional</Label><Select value={form.theme || "none"} onValueChange={(v) => setForm({ ...form, theme: v === "none" ? "" : v })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">— selecione —</SelectItem>{RELATIONAL_THEMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}<SelectItem value="outro">outro tema...</SelectItem></SelectContent></Select></div>{form.theme === "outro" && <div><Label>Outro tema</Label><Input className="mt-2" value={form.otherTheme} onChange={(e) => setForm({ ...form, otherTheme: e.target.value })} /></div>}</div>
      <div><Label>Contexto</Label><Textarea rows={3} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="De onde veio essa ideia?" className="mt-2" /></div>
      <ChipRow label="Formato pretendido" value={form.preferred_format} onChange={(v) => setForm({ ...form, preferred_format: v })} items={[['reels','Reel'],['carrossel','Carrossel'],['texto','Legenda'],['ia','Deixar a IA decidir']]} />
      <ChipRow label="Ancoragem clínica" value={form.clinical_anchor} onChange={(v) => setForm({ ...form, clinical_anchor: v })} items={[["IBCT","IBCT"],["Gottman","Gottman"],["IBCT+Gottman","IBCT + Gottman"],["logica","Só a lógica"]]} />
      <ChipRow label="Urgência" value={form.urgency} onChange={(v) => setForm({ ...form, urgency: v })} items={[["postar_semana","Postar essa semana"],["sem_pressa","Sem pressa"],["evergreen","Evergreen"]]} />
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={develop}>Desenvolver no Motor Relacional</Button><Button size="sm" variant="outline" onClick={sendEditorial}>Enviar para Editorial</Button><Button size="sm" variant="ghost" onClick={saveEnrichment}>Salvar enriquecimento</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={archive}>Arquivar</Button></div>
    </div>}
  </Card>;
}

function ChipRow({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return <div><Label>{label}</Label><div className="mt-2 flex flex-wrap gap-2">{items.map(([k, v]) => <Button key={k} type="button" size="sm" variant={value === k ? "default" : "outline"} onClick={() => onChange(k)}>{v}</Button>)}</div></div>;
}

function urgencyRank(urgency?: string | null) {
  return urgency === "postar_semana" ? 3 : urgency === "evergreen" ? 2 : 1;
}

export function FloatingIdeaCapture() {
  const { scope } = useScope();
  const upsertIdea = useUpsertIdea();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const save = async () => {
    if (!text.trim()) return;
    await upsertIdea.mutateAsync({ title: text.trim(), scope: (scope === "todos" ? "profissional" : scope) as any, source: "Captura rápida", idea_status: "nova", urgency: "sem_pressa" } as any);
    setText("");
    setOpen(false);
  };
  return <><Button size="icon" className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg" onClick={() => setOpen(true)}><Plus className="h-5 w-5" /></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" />Capturar ideia</DialogTitle></DialogHeader><Textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }} placeholder="Campo de texto livre" /><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!text.trim() || upsertIdea.isPending}>Salvar</Button></DialogFooter></DialogContent></Dialog></>;
}