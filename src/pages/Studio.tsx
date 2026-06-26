import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Film,
  Loader2,
  Mic,
  MicOff,
  MoreVertical,
  PenLine,
  Pencil,
  Play,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextareaWithMic } from "@/components/ui/textarea-with-mic";
import { startOfWeekFor, weekDates, dayName, dayNumber, isToday } from "@/lib/week";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MicButton } from "@/components/MicButton";

type PhaseData = {
  tipo_entrada?: string;
  origem?: string;
  conteudo?: string;
  conteudo_audiencia?: string;
  insight_manual?: string;
  ia_leitura_fase1?: {
    energia_sugerida?: string;
    observacao?: string;
    padroes_audiencia?: string | null;
    caminho_narrativo?: string;
  };
  intencao_uso?: string;
  objetivo?: string;
  meta_resultado?: string;
  metas_resultado?: string[];
  ia_validacao_fase2?: {
    aprovado_para_roteiro?: boolean;
    status?: "alinhado" | "conflito";
    comentario?: string;
    sugestao?: string | null;
    metas_sugeridas?: string[];
    insights_estrategicos?: string[];
    evitar?: string[];
  };
  // Fase 3
  template_selecionado?: ScriptStructure | null;
  insights_gerados?: Insight[];
  insights_aprovados?: Insight[];
  blocos_rascunho?: ScriptBlock[];
  blocos_editados?: ScriptBlock[];
  blocos_salvos_usuario?: ScriptBlock[];
  blocos_ajustados?: ScriptBlock[];
  papeis_modificados?: string[];
  instrucao_ajuste_livre?: string;
  ajustes_marcados?: string[];
  roteiro_protegido?: boolean;
  insights_multiconteudo?: Insight[];
  revisao_ia?: ReviewIA;
  analise_ajustes_ia?: { papeis_modificados?: string[]; sugestoes?: string; blocos_sugeridos?: ScriptBlock[] };
  sugestao_cortes?: { blocos?: ScriptBlock[]; target?: number };
  sugestoes_ponto_fraco?: Record<string, ScriptBlock[]>;
  [k: string]: unknown;
};

type ScriptStructure = unknown;
type Insight = {
  id?: string;
  titulo_angulo?: string;
  tensao?: string;
  frase_semente?: string;
  revelacao?: string;
  energia_sugerida?: string;
};
type ScriptBlock = {
  papel: string;
  texto: string;
  nota_gravacao?: string;
};
type ReviewIA = {
  score_retencao?: number;
  estimativa?: "baixa" | "moderada" | "alta";
  pontos_fortes?: string[];
  pontos_fracos?: { ponto: string; correcao: string }[];
  alerta_posicionamento?: string | null;
  comentario_final?: string;
};

type Piece = {
  id: string;
  title: string | null;
  theme: string | null;
  phase: number | null;
  status: string | null;
  scope: string | null;
  energia: string | null;
  creation_strategy: string | null;
  planned_date: string | null;
  series_name: string | null;
  series_position: number | null;
  phase_data: PhaseData | null;
  ai_memory: unknown;
  teleprompter_font_size: number | null;
  script: string | null;
  pipeline_stage: string | null;
  pre_recording_notes: string | null;
  editing_checklist: { label: string; done: boolean }[] | null;
  editing_notes: string | null;
  caption: string | null;
  tiktok_script: string | null;
  carousel_script: string | null;
  stories_script: string | null;
  debate_caption: string | null;
  published_at: string | null;
  performance_analysis: PerformanceAnalysis | null;
  parent_piece_id: string | null;
  updated_at: string;
};

type PerformanceAnalysis = {
  o_que_funcionou?: { ponto: string; razao: string }[];
  o_que_nao_funcionou?: { ponto: string; hipotese: string; correcao: string }[];
  proximos_conteudos?: string;
  reuso_sugerido?: boolean;
  memoria_entrada?: Record<string, unknown>;
  comparacao_posts?: string;
  serie_proxima_sugestao?: string;
  comentarios_para_conteudo?: { comentario: string; tema_sugerido: string }[];
};

const PHASES = [
  { n: 1, label: "Tema" },
  { n: 2, label: "Estratégia" },
  { n: 3, label: "Roteiro" },
  { n: 4, label: "Produção" },
  { n: 5, label: "Desempenho" },
];

const TIPO_ENTRADA = ["Observação clínica", "Referência externa", "Tema recorrente", "Insight espontâneo"];

const ENERGIAS = [
  { v: "topo", label: "TOPO", desc: "Identificação — a pessoa pensa: isso sou eu" },
  { v: "meio", label: "MEIO", desc: "Confiança clínica — a pessoa pensa: ela sabe do que fala" },
  { v: "fundo", label: "FUNDO", desc: "Reduzir resistência — a pessoa pensa: talvez eu precise de ajuda" },
];

const ESTRATEGIAS = ["Criar identificação", "Ensinar", "Inspirar", "Gerar leads"];

const METAS_RESULTADO = [
  "Crescer seguidores",
  "Gerar DMs",
  "Agendar sessão",
  "Aumentar salvamentos",
  "Engajamento nos comentários",
];

const INTENCOES_USO = [
  { v: "identificacao", label: "🎯 Identificação", desc: "a pessoa vai se reconhecer" },
  { v: "ensino", label: "📚 Ensino", desc: "vou explicar algo que ela não sabe nomear" },
  { v: "insight", label: "💡 Insight", desc: "vou virar a perspectiva dela" },
  { v: "debate", label: "🔥 Debate", desc: "quero provocar reação e comentários" },
  { v: "conexao", label: "🤝 Conexão", desc: "quero aproximar e gerar DM" },
];

function VoiceButton({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const SR =
    typeof window !== "undefined"
      ? ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ??
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
      : undefined;
  const supported = !!SR;
  const [recording, setRecording] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const toggle = () => {
    if (!supported) return;
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SR as any)();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript ?? "";
        if (text) onResult(text);
      };
      rec.onend = () => setRecording(false);
      rec.onerror = () => setRecording(false);
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={!supported}
      onClick={toggle}
      className={cn("h-7 px-2", recording && "text-red-500")}
      title={supported ? (recording ? "Parar" : "Ditar por voz") : "Voz não suportada"}
    >
      {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}

function LabelRow({ children, onVoice }: { children: React.ReactNode; onVoice: (t: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label>{children}</Label>
      <VoiceButton onResult={onVoice} />
    </div>
  );
}

const energiaBadge = (energia: string | null | undefined) => {
  if (!energia) return null;
  const map: Record<string, string> = {
    topo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    meio: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    fundo: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  };
  const cls = map[energia.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${cls}`}>
      {energia}
    </Badge>
  );
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
};

/** Debounced patch hook */
function useDebouncedSave(pieceId: string | null) {
  const qc = useQueryClient();
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = async () => {
    if (!pieceId) return;
    const patch = pending.current;
    if (Object.keys(patch).length === 0) return;
    pending.current = {};
    const { error } = await supabase.from("content_pieces").update(patch as never).eq("id", pieceId);
    if (error) {
      toast.error("Falha ao salvar: " + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["studio-piece", pieceId] });
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
  };

  const queue = (patch: Record<string, unknown>) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  return { queue, flush };
}

/* ================================================================== */
/* SÉRIES — Card e Dialogs                                            */
/* ================================================================== */

type SerieRow = {
  id: string; name: string; description: string | null;
  total_episodes_planned: number | null; instagram_url: string | null;
  status: string; started_at: string | null;
};
type SeriePieceRow = Pick<Piece, "id"|"title"|"phase"|"status"|"energia"|"series_name"|"series_position"|"planned_date"|"published_at"|"pipeline_stage"> & { performance_analysis: unknown };
type SeriesAnalysis = {
  funcionando?: string;
  mudar?: string;
  proximos_episodios?: string;
  vale_continuar?: "sim" | "talvez" | "nao";
  recomendacao?: string;
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ativa: "bg-emerald-100 text-emerald-800",
    pausada: "bg-amber-100 text-amber-800",
    encerrada: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("text-[10px] uppercase font-semibold px-2 py-0.5 rounded", map[status] ?? map.encerrada)}>
      {status}
    </span>
  );
}

function phaseBadge(p: SeriePieceRow) {
  if (p.status === "publicado" || (p.phase ?? 0) >= 5) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Publicado</span>;
  }
  const ph = p.phase ?? 1;
  if (ph <= 2) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Planejado</span>;
  if (ph === 3) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Roteiro</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Em produção</span>;
}

function NewSeriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState<string>("");
  const [igUrl, setIgUrl] = useState("");
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hasPrevious, setHasPrevious] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setDescription(""); setTotal(""); setIgUrl("");
    setStartedAt(new Date().toISOString().slice(0, 10)); setHasPrevious(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("content_series").insert({
      name: name.trim(),
      description: description.trim() || null,
      total_episodes_planned: total ? Number(total) : null,
      instagram_url: igUrl.trim() || null,
      started_at: startedAt || null,
      status: "ativa",
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["studio-series-list"] });
    qc.invalidateQueries({ queryKey: ["studio-series"] });
    toast.success("Série criada");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova série</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da série *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Comunicação não-violenta" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que esta série vai explorar?"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Total de episódios planejados</Label>
            <Input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL no Instagram</Label>
            <Input value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="https://instagram.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data de início</Label>
            <Input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
            <Checkbox checked={hasPrevious} onCheckedChange={(v) => setHasPrevious(v === true)} className="mt-0.5" />
            Esta série já tem episódios no Instagram que preciso registrar
          </label>
          {hasPrevious && (
            <p className="text-xs text-muted-foreground border-l-2 border-accent pl-2">
              Use "＋ Post espontâneo" na semana editorial para registrar os episódios anteriores,
              ou "📥 Vincular peça existente" depois de criar a série.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar série
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SeriesCardItem({
  serie,
  pieces,
  allUnlinked,
  onOpenPiece,
}: {
  serie: SerieRow;
  pieces: SeriePieceRow[];
  allUnlinked: Piece[];
  onOpenPiece: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysis, setAnalysis] = useState<SeriesAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSel, setLinkSel] = useState<Record<string, { checked: boolean; pos: string }>>({});
  const [scheduleMap, setScheduleMap] = useState<Record<string, string>>({});

  const sortedPieces = useMemo(
    () => [...pieces].sort((a, b) => (a.series_position ?? 999) - (b.series_position ?? 999)),
    [pieces],
  );
  const maxPos = sortedPieces.reduce((m, p) => Math.max(m, p.series_position ?? 0), 0);
  const totalPieces = sortedPieces.length;
  const publishedPieces = sortedPieces.filter((p) => p.status === "publicado");
  const published = publishedPieces.length;
  const denom = serie.total_episodes_planned ?? totalPieces ?? 1;
  const pct = Math.min(100, Math.round((published / Math.max(1, denom)) * 100));

  const createEpisode = async () => {
    const nextPos = maxPos + 1;
    const { data, error } = await supabase
      .from("content_pieces")
      .insert({
        title: `${serie.name} — Ep ${nextPos}`,
        phase: 1,
        status: "ideia",
        scope: "profissional",
        series_name: serie.name,
        series_position: nextPos,
      } as never)
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
    onOpenPiece((data as { id: string }).id);
  };

  const saveLinks = async () => {
    const sel = Object.entries(linkSel).filter(([, v]) => v.checked);
    if (sel.length === 0) { setLinkOpen(false); return; }
    for (const [id, v] of sel) {
      const pos = v.pos ? Number(v.pos) : null;
      await supabase
        .from("content_pieces")
        .update({ series_name: serie.name, series_position: pos } as never)
        .eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
    toast.success(`${sel.length} peça(s) vinculada(s)`);
    setLinkSel({});
    setLinkOpen(false);
  };

  const analisarSerie = async () => {
    setAnalyzing(true);
    try {
      const episodios = publishedPieces.map((p) => {
        const perf = (p.performance_analysis ?? null) as { memoria_entrada?: { views?: number; saves?: number; dms?: number; resultado?: string } } | null;
        const mem = perf?.memoria_entrada ?? {};
        return {
          ep: p.series_position,
          titulo: p.title,
          views: mem.views,
          saves: mem.saves,
          dms: mem.dms,
          resultado: mem.resultado,
          energia: p.energia,
        };
      });
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "analyze_series",
          payload: {
            series_name: serie.name,
            episodios,
            total_planejado: serie.total_episodes_planned,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis((data?.result ?? null) as SeriesAnalysis | null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setAnalyzing(false);
    }
  };

  const agendar = async (id: string) => {
    const date = scheduleMap[id];
    if (!date) return;
    const { error } = await supabase
      .from("content_pieces")
      .update({ planned_date: date } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
    toast.success("Episódio agendado");
  };

  const semDate = sortedPieces.filter((p) => !p.planned_date && p.status !== "publicado");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{serie.name}</span>
            {statusBadge(serie.status)}
          </div>
          {serie.description && (
            <p className="text-xs text-muted-foreground">{serie.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          ep {maxPos} de {serie.total_episodes_planned ?? "?"} · {published} publicado{published === 1 ? "" : "s"}
        </div>
        <div className="h-1.5 rounded bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {sortedPieces.length > 0 && (
        <div className="space-y-1 border-t pt-2">
          {sortedPieces.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenPiece(p.id)}
              className="w-full flex items-center justify-between gap-2 text-left text-xs px-2 py-1.5 rounded hover:bg-accent/10"
            >
              <span className="truncate">
                <span className="font-medium">Ep {p.series_position ?? "?"} —</span>{" "}
                {p.title ?? "Sem título"}
              </span>
              {phaseBadge(p)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={createEpisode}>
          ＋ Novo episódio
        </Button>
        <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
          📥 Vincular peça existente
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAnalysisOpen((v) => !v)}>
          📊 {analysisOpen ? "Fechar análise" : "Analisar série"}
        </Button>
      </div>

      {analysisOpen && (
        <div className="space-y-4 border-t pt-3">
          {/* Tabela métricas */}
          <div>
            <div className="text-xs uppercase font-medium opacity-60 mb-1">Métricas dos episódios publicados</div>
            {publishedPieces.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum episódio publicado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2">Ep</th>
                      <th className="py-1 pr-2">Título</th>
                      <th className="py-1 pr-2">Views</th>
                      <th className="py-1 pr-2">Salv.</th>
                      <th className="py-1 pr-2">DMs</th>
                      <th className="py-1 pr-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedPieces.map((p) => {
                      const perf = (p.performance_analysis ?? null) as { memoria_entrada?: { views?: number; saves?: number; dms?: number; resultado?: string } } | null;
                      const mem = perf?.memoria_entrada ?? {};
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="py-1 pr-2 tabular-nums">{p.series_position ?? "—"}</td>
                          <td className="py-1 pr-2">{p.title}</td>
                          <td className="py-1 pr-2 tabular-nums">{mem.views ?? "—"}</td>
                          <td className="py-1 pr-2 tabular-nums">{mem.saves ?? "—"}</td>
                          <td className="py-1 pr-2 tabular-nums">{mem.dms ?? "—"}</td>
                          <td className="py-1 pr-2">{mem.resultado ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Análise IA */}
          <div className="space-y-2">
            <Button size="sm" variant="outline" onClick={analisarSerie} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Avaliar esta série com IA
            </Button>
            {analysis && (
              <div className="grid sm:grid-cols-2 gap-2">
                {analysis.funcionando && (
                  <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                    <div className="text-[11px] uppercase font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      O que está funcionando
                    </div>
                    <p className="text-xs">{analysis.funcionando}</p>
                  </Card>
                )}
                {analysis.mudar && (
                  <Card className="p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                    <div className="text-[11px] uppercase font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      O que precisa mudar
                    </div>
                    <p className="text-xs">{analysis.mudar}</p>
                  </Card>
                )}
                {analysis.proximos_episodios && (
                  <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                    <div className="text-[11px] uppercase font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      Sugestão para os próximos episódios
                    </div>
                    <p className="text-xs">{analysis.proximos_episodios}</p>
                  </Card>
                )}
                {analysis.recomendacao && (
                  <Card className="p-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                    <div className="text-[11px] uppercase font-semibold text-purple-800 dark:text-purple-300 mb-1">
                      Vale continuar? {analysis.vale_continuar && (
                        <span className="ml-1 font-bold">[{analysis.vale_continuar.toUpperCase()}]</span>
                      )}
                    </div>
                    <p className="text-xs">{analysis.recomendacao}</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Planejamento próximos episódios */}
          {semDate.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase font-medium opacity-60">Agendar próximos episódios</div>
              {semDate.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate">Ep {p.series_position ?? "?"} — {p.title}</span>
                  <Input
                    type="date"
                    className="h-8 w-40"
                    value={scheduleMap[p.id] ?? ""}
                    onChange={(e) => setScheduleMap((m) => ({ ...m, [p.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" onClick={() => agendar(p.id)} disabled={!scheduleMap[p.id]}>
                    Agendar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog vincular peças */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vincular peça a esta série</DialogTitle></DialogHeader>
          {allUnlinked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma peça avulsa disponível.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allUnlinked.map((p) => {
                const cur = linkSel[p.id] ?? { checked: false, pos: "" };
                return (
                  <div key={p.id} className="flex items-center gap-2 border rounded p-2">
                    <Checkbox
                      checked={cur.checked}
                      onCheckedChange={(v) =>
                        setLinkSel((m) => ({ ...m, [p.id]: { ...cur, checked: v === true } }))
                      }
                    />
                    <span className="flex-1 text-xs truncate">
                      {p.title ?? "Sem título"}
                      {p.series_name && (
                        <span className="text-[10px] text-muted-foreground ml-1">(atualmente: {p.series_name})</span>
                      )}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      placeholder="ep"
                      className="h-8 w-16"
                      value={cur.pos}
                      onChange={(e) =>
                        setLinkSel((m) => ({ ...m, [p.id]: { ...cur, pos: e.target.value } }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>Cancelar</Button>
            <Button onClick={saveLinks}>Vincular selecionadas</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


export default function Studio() {
  const qc = useQueryClient();
  const [view, setView] = useState<"biblioteca" | "foco" | "stories" | "calendario">("biblioteca");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialPhase, setInitialPhase] = useState<number | undefined>(undefined);
  const [initialTeleOpen, setInitialTeleOpen] = useState(false);

  const openPiece = (id: string, phase?: number, teleOpen?: boolean) => {
    setActiveId(id);
    setInitialPhase(phase);
    setInitialTeleOpen(teleOpen ?? false);
    setView("foco");
  };

  const piecesQ = useQuery({
    queryKey: ["studio-pieces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select(
          "id,title,theme,phase,status,scope,energia,creation_strategy,planned_date,published_at,series_name,series_position,phase_data,pipeline_stage,script,editing_checklist,updated_at",
        )
        .eq("scope", "profissional")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Piece[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const title = `Nova peça ${new Date().toLocaleString("pt-BR")}`;
      const { data, error } = await supabase
        .from("content_pieces")
        .insert({ title, phase: 1, status: "ideia", scope: "profissional" } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["studio-pieces"] });
      openPiece(id, 1);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_pieces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-pieces"] });
      toast.success("Peça apagada");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao apagar"),
  });

  // ------- Ideas (banco de ideias) -------
  const ideasQ = useQuery({
    queryKey: ["studio-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_ideas")
        .select("id,title,energia,used,scope,created_at")
        .eq("used", false)
        .eq("scope", "profissional")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; energia: string | null; used: boolean; scope: string; created_at: string }[];
    },
  });

  // ------- Séries -------
  const seriesListQ = useQuery({
    queryKey: ["studio-series-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_series")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as {
        id: string; name: string; description: string | null;
        total_episodes_planned: number | null; instagram_url: string | null;
        status: string; started_at: string | null;
      }[];
    },
  });

  const seriesPiecesQ = useQuery({
    queryKey: ["studio-series-pieces"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_pieces")
        .select("id,title,phase,status,energia,series_name,series_position,planned_date,published_at,performance_analysis,pipeline_stage")
        .not("series_name", "is", null)
        .order("series_name")
        .order("series_position", { ascending: true, nullsFirst: false });
      return (data ?? []) as (Pick<Piece, "id"|"title"|"phase"|"status"|"energia"|"series_name"|"series_position"|"planned_date"|"published_at"|"pipeline_stage"> & { performance_analysis: unknown })[];
    },
  });

  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaText, setIdeaText] = useState("");
  const [ideaEnergia, setIdeaEnergia] = useState<string>("none");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"andamento" | "publicadas">("andamento");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [seriesPanelOpen, setSeriesPanelOpen] = useState(true);
  const [newSeriesOpen, setNewSeriesOpen] = useState(false);

  const [quickPostOpen, setQuickPostOpen] = useState(false);
  const [qpTitle, setQpTitle] = useState("");
  const [qpTema, setQpTema] = useState("");
  const [qpEnergia, setQpEnergia] = useState("topo");
  const [qpStatus, setQpStatus] = useState<"publicado" | "pronto_postar">("publicado");
  const [qpDate, setQpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [qpSeries, setQpSeries] = useState("none");
  const [qpEpNum, setQpEpNum] = useState("");
  const [qpViews, setQpViews] = useState("");
  const [qpSaves, setQpSaves] = useState("");
  const [qpDms, setQpDms] = useState("");
  const [qpCaption, setQpCaption] = useState("");
  const [qpSaving, setQpSaving] = useState(false);

  const saveIdea = async () => {
    const txt = ideaText.trim();
    if (!txt) return;
    const energia = ideaEnergia === "none" ? null : ideaEnergia;
    const { error } = await supabase.from("content_ideas").insert({
      title: txt,
      scope: "profissional",
      energia,
      used: false,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["studio-ideas"] });
    setIdeaText("");
    setIdeaEnergia("none");
    setIdeaOpen(false);
    toast.success("Ideia salva");
  };

  const startPieceFromIdea = async (idea: { id: string; title: string; energia: string | null }) => {
    const { data, error } = await supabase
      .from("content_pieces")
      .insert({
        title: idea.title,
        theme: idea.title,
        phase: 1,
        status: "ideia",
        scope: "profissional",
        energia: idea.energia,
      } as never)
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("content_ideas").update({ used: true } as never).eq("id", idea.id);
    qc.invalidateQueries({ queryKey: ["studio-ideas"] });
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    openPiece(data.id as string, 1);
  };

  const archiveIdea = async (id: string) => {
    const { error } = await supabase.from("content_ideas").update({ used: true } as never).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["studio-ideas"] });
    toast.success("Ideia arquivada");
  };

  const markAsRecorded = async (id: string) => {
    const { error } = await supabase
      .from("content_pieces")
      .update({ pipeline_stage: "gravando" } as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    toast.success("Marcado como gravado");
  };

  // ------- Production queues -------
  const items = piecesQ.data ?? [];
  const sortByDate = (a: Piece, b: Piece) =>
    (a.planned_date ?? "9999") < (b.planned_date ?? "9999") ? -1 : 1;

  const roteirizar = items
    .filter((it) => (it.phase ?? 1) <= 3 || ((it.phase ?? 1) === 4 && !it.script))
    .sort(sortByDate);
  const gravar = items
    .filter(
      (it) =>
        (it.phase ?? 1) === 4 &&
        !!it.script &&
        !["gravando", "pronto_postar", "publicado"].includes(it.pipeline_stage ?? ""),
    )
    .sort(sortByDate);
  const editar = items.filter((it) => it.pipeline_stage === "gravando").sort(sortByDate);

  // ------- Semana editorial -------
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeekFor(todayIso);
  const weekDays = weekDates(weekStart);
  const piecesByDay: Record<string, Piece[]> = {};
  for (const d of weekDays) piecesByDay[d] = [];
  for (const it of items) {
    const dateKey = it.planned_date ?? it.published_at ?? null;
    if (dateKey && piecesByDay[dateKey]) {
      piecesByDay[dateKey].push(it);
    }
  }

  // ------- Archive lists -------
  const phaseLabel = (n: number | null) => {
    const labels = ["Tema", "Estratégia", "Roteiro", "Produção", "Publicado"];
    return labels[Math.max(0, Math.min(4, (n ?? 1) - 1))];
  };
  const andamento = items.filter((it) => it.status !== "publicado");
  const publicadas = items.filter((it) => it.status === "publicado");
  const archiveList = archiveTab === "andamento" ? andamento : publicadas;

  const QueueCard = ({
    it,
    children,
  }: {
    it: Piece;
    children: React.ReactNode;
  }) => (
    <Card className="p-3 space-y-2 bg-background/80">
      <div className="text-sm font-semibold line-clamp-2">{it.title ?? "Sem título"}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {energiaBadge(it.energia)}
        {it.planned_date && (
          <span className="text-[10px] text-muted-foreground">{formatDate(it.planned_date)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">{children}</div>
    </Card>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {view === "biblioteca" ? (
          <>
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
                  <Clapperboard className="h-7 w-7 text-accent" />
                  Studio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">seu estúdio de conteúdo</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setView("stories")}>
                  📱 Stories do dia
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuickPostOpen(true)}>
                  ⚡ Post rápido
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView("calendario")}>
                  📅 Calendário
                </Button>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                  <Plus className="h-4 w-4" />
                  Nova peça
                </Button>
              </div>
            </div>

            {/* SEÇÃO 1: Fila de produção */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">🎬 O que fazer agora</h2>
                <p className="text-sm text-muted-foreground">
                  {roteirizar.length} para roteirizar · {gravar.length} para gravar · {editar.length} para editar
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-x-auto">
                {/* Roteirizar */}
                <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20 space-y-2 min-w-[260px]">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                    <PenLine className="h-4 w-4" /> Roteirizar
                  </div>
                  {roteirizar.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Tudo em dia ✓</p>
                  ) : (
                    roteirizar.map((it) => (
                      <QueueCard key={it.id} it={it}>
                        <Button size="sm" variant="outline" onClick={() => openPiece(it.id, 3)}>
                          Abrir roteiro
                        </Button>
                      </QueueCard>
                    ))
                  )}
                </div>

                {/* Gravar */}
                <div className="rounded-lg p-3 bg-green-50 dark:bg-green-950/20 space-y-2 min-w-[260px]">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-900 dark:text-green-200">
                    <Video className="h-4 w-4" /> Gravar
                  </div>
                  {gravar.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Nada para gravar agora ✓</p>
                  ) : (
                    gravar.map((it) => (
                      <QueueCard key={it.id} it={it}>
                        <Button size="sm" variant="outline" onClick={() => openPiece(it.id, 4, true)}>
                          Ver teleprompter
                        </Button>
                        <Button size="sm" onClick={() => markAsRecorded(it.id)}>
                          ✓ Gravado
                        </Button>
                      </QueueCard>
                    ))
                  )}
                </div>

                {/* Editar e postar */}
                <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20 space-y-2 min-w-[260px]">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                    <Scissors className="h-4 w-4" /> Editar e postar
                  </div>
                  {editar.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Nada para editar agora ✓</p>
                  ) : (
                    editar.map((it) => {
                      const done = (it.editing_checklist ?? []).filter((c) => c.done).length;
                      const total = (it.editing_checklist ?? []).length || 15;
                      return (
                        <Card key={it.id} className="p-3 space-y-2 bg-background/80">
                          <div className="text-sm font-semibold line-clamp-2">{it.title ?? "Sem título"}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {done}/{total} itens
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openPiece(it.id, 4)}>
                            Abrir edição
                          </Button>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* SEÇÃO: Séries */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">📺 Séries</h2>
                  <Button size="sm" variant="ghost" onClick={() => setSeriesPanelOpen((v) => !v)}>
                    {seriesPanelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setNewSeriesOpen(true)}>
                  <Plus className="h-4 w-4" /> Nova série
                </Button>
              </div>

              {seriesPanelOpen && (
                <div>
                  {(seriesListQ.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma série ainda. Crie uma para agrupar episódios e analisar resultados em conjunto.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(seriesListQ.data ?? []).map((s) => (
                        <SeriesCardItem
                          key={s.id}
                          serie={s}
                          pieces={(seriesPiecesQ.data ?? []).filter((p) => p.series_name === s.name)}
                          allUnlinked={items.filter((p) => p.series_name !== s.name)}
                          onOpenPiece={openPiece}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>



            {/* SEÇÃO 2: Banco de ideias */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">💡 Banco de ideias</h2>
                <Button size="sm" variant="outline" onClick={() => setIdeaOpen(true)}>
                  <Plus className="h-4 w-4" /> Capturar ideia
                </Button>
              </div>
              {(ideasQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ideia capturada. Capture enquanto estiver no feeling.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(ideasQ.data ?? []).map((idea) => {
                    const short = idea.title.length > 40 ? idea.title.slice(0, 40) + "…" : idea.title;
                    return (
                      <div
                        key={idea.id}
                        className="flex items-center gap-1.5 rounded-full border bg-card pl-3 pr-1 py-1 text-xs"
                      >
                        <span>{short}</span>
                        {energiaBadge(idea.energia)}
                        <button
                          type="button"
                          title="Iniciar peça"
                          onClick={() => startPieceFromIdea(idea)}
                          className="h-6 w-6 rounded-full hover:bg-accent/20 flex items-center justify-center"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          title="Arquivar"
                          onClick={() => archiveIdea(idea.id)}
                          className="h-6 w-6 rounded-full hover:bg-destructive/20 flex items-center justify-center text-muted-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SEÇÃO 3: Semana editorial */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">📅 Semana editorial</h2>
                {(() => {
                  const seriesThisWeek = [...new Set(
                    Object.values(piecesByDay).flat()
                      .filter((p) => p.series_name)
                      .map((p) => p.series_name),
                  )];
                  return seriesThisWeek.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {seriesThisWeek.map((name) => (
                        <span key={name as string} className="text-[10px] bg-accent/20 rounded px-1.5 py-0.5">📺 {name}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((d) => {
                  const today = isToday(d);
                  const dayPieces = piecesByDay[d] ?? [];
                  return (
                    <div
                      key={d}
                      className={cn(
                        "rounded-lg p-2 min-h-[110px] border space-y-1.5",
                        today ? "border-accent bg-accent/10" : "border-dashed",
                      )}
                    >
                      <div className="text-[10px] uppercase text-muted-foreground flex items-baseline gap-1">
                        <span>{dayName(d)}</span>
                        <span className="font-semibold text-foreground">{dayNumber(d)}</span>
                      </div>
                      {dayPieces.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">livre</p>
                      ) : (
                        dayPieces.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => openPiece(it.id)}
                            className="w-full text-left rounded p-1.5 bg-background hover:bg-accent/10 border space-y-1"
                          >
                            <div className="text-[11px] font-medium line-clamp-2">{it.title ?? "Sem título"}</div>
                            {energiaBadge(it.energia)}
                            {it.series_name && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                📺 {it.series_name} {it.series_position ? `ep ${it.series_position}` : ""}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SEÇÃO 4: Arquivo */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">📁 Todas as peças</h2>
                <Button size="sm" variant="ghost" onClick={() => setArchiveOpen((v) => !v)}>
                  {archiveOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {archiveOpen ? "Fechar" : "Abrir"}
                </Button>
              </div>
              {archiveOpen && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["andamento", "publicadas"] as const).map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={archiveTab === t ? "default" : "outline"}
                        onClick={() => setArchiveTab(t)}
                      >
                        {t === "andamento" ? "Em andamento" : "Publicadas"}
                      </Button>
                    ))}
                  </div>
                  {archiveList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma peça aqui.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {archiveList.map((it) => (
                        <Card key={it.id} className="p-3 space-y-2 relative">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-semibold line-clamp-2 flex-1">{it.title ?? "Sem título"}</div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openPiece(it.id)}>Abrir</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setConfirmDelete(it.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Apagar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{phaseLabel(it.phase)}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {energiaBadge(it.energia)}
                            {it.planned_date && (
                              <span className="text-[10px] text-muted-foreground">{formatDate(it.planned_date)}</span>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Modal: nova série */}
            <NewSeriesDialog open={newSeriesOpen} onOpenChange={setNewSeriesOpen} />

            {/* Modal: post rápido */}
            <Dialog open={quickPostOpen} onOpenChange={setQuickPostOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>⚡ Post rápido</DialogTitle>
                  <p className="text-xs text-muted-foreground">Registre um conteúdo sem passar pelo fluxo completo de criação.</p>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Título *</Label>
                      <Input value={qpTitle} onChange={(e) => setQpTitle(e.target.value)} placeholder="Nome do conteúdo" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tema</Label>
                      <Input value={qpTema} onChange={(e) => setQpTema(e.target.value)} placeholder="Assunto central" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={qpStatus} onValueChange={(v) => setQpStatus(v as "publicado" | "pronto_postar")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="publicado">Já publicado</SelectItem>
                          <SelectItem value="pronto_postar">Pronto para postar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Energia</Label>
                      <Select value={qpEnergia} onValueChange={setQpEnergia}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="topo">Topo</SelectItem>
                          <SelectItem value="meio">Meio</SelectItem>
                          <SelectItem value="fundo">Fundo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{qpStatus === "publicado" ? "Data de publicação" : "Data planejada"}</Label>
                    <Input type="date" value={qpDate} onChange={(e) => setQpDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Série (opcional)</Label>
                    <div className="flex gap-2">
                      <Select value={qpSeries} onValueChange={setQpSeries}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {(seriesListQ.data ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {qpSeries !== "none" && (
                        <Input type="number" min={1} placeholder="Ep nº" className="w-20"
                          value={qpEpNum} onChange={(e) => setQpEpNum(e.target.value)} />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Legenda (opcional)</Label>
                    <Textarea value={qpCaption} onChange={(e) => setQpCaption(e.target.value)}
                      placeholder="Cole a legenda usada no post" rows={2} />
                  </div>
                  {qpStatus === "publicado" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Métricas principais (opcional)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-[10px]">Views</Label>
                          <Input type="number" min={0} value={qpViews} onChange={(e) => setQpViews(e.target.value)} /></div>
                        <div><Label className="text-[10px]">Salvamentos</Label>
                          <Input type="number" min={0} value={qpSaves} onChange={(e) => setQpSaves(e.target.value)} /></div>
                        <div><Label className="text-[10px]">DMs</Label>
                          <Input type="number" min={0} value={qpDms} onChange={(e) => setQpDms(e.target.value)} /></div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={() => setQuickPostOpen(false)}>Cancelar</Button>
                    <Button
                      disabled={!qpTitle.trim() || qpSaving}
                      onClick={async () => {
                        setQpSaving(true);
                        try {
                          const { data, error } = await supabase
                            .from("content_pieces")
                            .insert({
                              title: qpTitle.trim(),
                              theme: qpTema.trim() || qpTitle.trim(),
                              status: qpStatus,
                              phase: qpStatus === "publicado" ? 5 : 4,
                              scope: "profissional",
                              energia: qpEnergia,
                              planned_date: qpStatus === "pronto_postar" ? qpDate : null,
                              published_at: qpStatus === "publicado" ? qpDate : null,
                              pipeline_stage: qpStatus === "publicado" ? "publicado" : "pronto_postar",
                              series_name: qpSeries !== "none" ? qpSeries : null,
                              series_position: qpSeries !== "none" && qpEpNum ? Number(qpEpNum) : null,
                              caption: qpCaption.trim() || null,
                            } as never)
                            .select("id")
                            .single();
                          if (error) throw error;
                          if (qpStatus === "publicado" && (qpViews || qpSaves || qpDms)) {
                            await supabase.from("content_metrics").insert({
                              piece_id: (data as { id: string }).id,
                              measured_at: qpDate,
                              views: qpViews ? Number(qpViews) : 0,
                              saves: qpSaves ? Number(qpSaves) : 0,
                              dms_recebidos: qpDms ? Number(qpDms) : 0,
                            } as never);
                          }
                          qc.invalidateQueries({ queryKey: ["studio-pieces"] });
                          qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
                          toast.success("Post registrado");
                          setQuickPostOpen(false);
                          setQpTitle(""); setQpTema(""); setQpEnergia("topo");
                          setQpStatus("publicado"); setQpDate(new Date().toISOString().slice(0, 10));
                          setQpSeries("none"); setQpEpNum(""); setQpViews("");
                          setQpSaves(""); setQpDms(""); setQpCaption("");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Erro ao salvar");
                        } finally {
                          setQpSaving(false);
                        }
                      }}
                    >
                      {qpSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Registrar post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal: capturar ideia */}
            <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Capturar ideia</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <TextareaWithMic
                    value={ideaText}
                    onValueChange={setIdeaText}
                    placeholder="Qual é o tema? Escreva como veio na cabeça."
                    micLang="pt-BR"
                    className="min-h-[140px]"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Energia</Label>
                    <Select value={ideaEnergia} onValueChange={setIdeaEnergia}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não sei ainda</SelectItem>
                        <SelectItem value="topo">Topo (identificação)</SelectItem>
                        <SelectItem value="meio">Meio (confiança)</SelectItem>
                        <SelectItem value="fundo">Fundo (converter)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIdeaOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveIdea} disabled={!ideaText.trim()}>
                      Salvar ideia
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Confirm delete */}
            <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apagar peça</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Apagar esta peça permanentemente? Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirmDelete) deleteMut.mutate(confirmDelete);
                      setConfirmDelete(null);
                    }}
                  >
                    Apagar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : view === "foco" ? (
          <FocoView
            pieceId={activeId}
            initialPhase={initialPhase}
            initialTeleOpen={initialTeleOpen}
            onBack={() => {
              setView("biblioteca");
              setActiveId(null);
              setInitialPhase(undefined);
              setInitialTeleOpen(false);
            }}
            onOpenPiece={(id) => openPiece(id)}
          />
        ) : view === "calendario" ? (
          <CalendarioEditorial
            pieces={piecesQ.data ?? []}
            seriesList={seriesListQ.data ?? []}
            onBack={() => setView("biblioteca")}
            onOpenPiece={openPiece}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ["studio-pieces"] });
              qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
            }}
          />
        ) : (
          <StoriesView
            pieces={piecesQ.data ?? []}
            onBack={() => setView("biblioteca")}
          />
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* FOCO VIEW                                                          */
/* ------------------------------------------------------------------ */

function FocoView({
  pieceId,
  onBack,
  onOpenPiece,
  initialPhase,
  initialTeleOpen,
}: {
  pieceId: string | null;
  onBack: () => void;
  onOpenPiece: (id: string) => void;
  initialPhase?: number;
  initialTeleOpen?: boolean;
}) {
  const qc = useQueryClient();
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const { queue, flush } = useDebouncedSave(pieceId);

  const pieceQ = useQuery({
    queryKey: ["studio-piece", pieceId],
    enabled: !!pieceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select("*")
        .eq("id", pieceId!)
        .single();
      if (error) throw error;
      return data as unknown as Piece;
    },
  });

  const piece = pieceQ.data;
  const reachedPhase = piece?.phase ?? 1;

  useEffect(() => {
    if (piece) setCurrentPhase(initialPhase ?? piece.phase ?? 1);
  }, [piece?.id]);

  useEffect(() => {
    return () => {
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceId]);

  if (!pieceId) return null;
  if (pieceQ.isLoading || !piece) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Biblioteca
        </Button>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const pd: PhaseData = piece.phase_data ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Biblioteca
        </Button>
      </div>

      <InlineTitle
        value={piece.title ?? ""}
        onChange={(v) => queue({ title: v })}
        onBlur={flush}
      />

      <PhaseNav
        current={currentPhase}
        reached={reachedPhase}
        onPick={(n) => setCurrentPhase(n)}
      />

      {currentPhase === 1 && (
        <Phase1
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          onAdvance={async () => {
            await flush();
            await supabase.from("content_pieces").update({ phase: 2 } as never).eq("id", piece.id);
            qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
            qc.invalidateQueries({ queryKey: ["studio-pieces"] });
            setCurrentPhase(2);
          }}
        />
      )}

      {currentPhase === 2 && (
        <Phase2
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          onAdvance={async () => {
            await flush();
            await supabase.from("content_pieces").update({ phase: 3 } as never).eq("id", piece.id);
            qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
            qc.invalidateQueries({ queryKey: ["studio-pieces"] });
            setCurrentPhase(3);
          }}
        />
      )}

      {currentPhase === 3 && (
        <Phase3
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          openTeleOnMount={initialTeleOpen}
          onAdvance={async () => {
            await flush();
            await supabase.from("content_pieces").update({ phase: 4 } as never).eq("id", piece.id);
            qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
            qc.invalidateQueries({ queryKey: ["studio-pieces"] });
            setCurrentPhase(4);
          }}
        />
      )}

      {currentPhase === 4 && (
        <Phase4
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          openTeleOnMount={initialTeleOpen}
          onAdvance={async (publishedAt: string) => {
            await flush();
            await supabase
              .from("content_pieces")
              .update({
                phase: 5,
                pipeline_stage: "publicado",
                status: "publicado",
                published_at: publishedAt,
              } as never)
              .eq("id", piece.id);
            qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
            qc.invalidateQueries({ queryKey: ["studio-pieces"] });
            setCurrentPhase(5);
          }}
        />
      )}

      {currentPhase === 5 && (
        <Phase5
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          onOpenPiece={onOpenPiece}
          onBack={onBack}
        />
      )}

    </div>
  );
}

/* ---------- Title inline ---------- */
function InlineTitle({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  if (editing) {
    return (
      <Input
        autoFocus
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => {
          setEditing(false);
          onBlur();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            onBlur();
          }
        }}
        className="text-2xl md:text-3xl font-semibold h-auto py-2"
      />
    );
  }
  return (
    <h1
      onClick={() => setEditing(true)}
      className="font-display text-2xl md:text-3xl font-semibold tracking-tight cursor-text hover:bg-muted/40 rounded px-2 -mx-2 py-1"
    >
      {value || "Sem título"}
    </h1>
  );
}

/* ---------- Phase nav ---------- */
function PhaseNav({
  current,
  reached,
  onPick,
}: {
  current: number;
  reached: number;
  onPick: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b">
      {PHASES.map((p) => {
        const disabled = p.n > reached;
        const active = p.n === current;
        return (
          <button
            key={p.n}
            disabled={disabled}
            onClick={() => onPick(p.n)}
            className={cn(
              "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
              active
                ? "border-accent text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
              disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            <span className="text-xs mr-1.5 text-muted-foreground">{p.n}</span>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Toggle group helper ---------- */
function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md border transition-colors",
              active
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-accent/50",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* PHASE 1 — TEMA                                                     */
/* ================================================================== */

function Phase1({
  piece,
  pd,
  queue,
  flush,
  onAdvance,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onAdvance: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(!!piece.series_name);
  const [seriesMode, setSeriesMode] = useState<"new" | "existing" | null>(
    piece.series_name ? "existing" : null,
  );
  const [audienceOpen, setAudienceOpen] = useState(!!pd.conteudo_audiencia);
  const temaRef = useRef<HTMLTextAreaElement>(null);
  const conteudoRef = useRef<HTMLTextAreaElement>(null);
  const audienciaRef = useRef<HTMLTextAreaElement>(null);

  const seriesQ = useQuery({
    queryKey: ["studio-series"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_pieces")
        .select("series_name, series_position")
        .not("series_name", "is", null)
        .order("series_name");
      const names = [...new Set((data ?? []).map((d) => d.series_name).filter(Boolean))];
      return names as string[];
    },
  });

  const appendTo = (
    ref: React.RefObject<HTMLTextAreaElement>,
    apply: (text: string) => void,
  ) => (spoken: string) => {
    const el = ref.current;
    if (!el) return;
    const prev = el.value ?? "";
    const next = prev ? `${prev} ${spoken}`.trim() : spoken;
    el.value = next;
    apply(next);
  };

  const patchPD = (p: Partial<PhaseData>) => queue({ phase_data: { ...pd, ...p } });

  const callAI = async () => {
    setLoading(true);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "phase1_read",
          payload: {
            tema: piece.theme,
            tipo_entrada: pd.tipo_entrada,
            origem: pd.origem,
            conteudo: pd.conteudo,
            conteudo_audiencia: pd.conteudo_audiencia,
            serie_nome: piece.series_name,
            serie_position: piece.series_position,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.result ?? {};
      queue({ phase_data: { ...pd, ia_leitura_fase1: result } });
      await flush();
      toast.success("Leitura da IA pronta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <LabelRow onVoice={appendTo(temaRef, (v) => queue({ theme: v }))}>Qual é o tema?</LabelRow>
          <Textarea
            ref={temaRef}
            defaultValue={piece.theme ?? ""}
            onChange={(e) => queue({ theme: e.target.value })}
            placeholder="Ex: O custo emocional de ser sempre o adulto no relacionamento"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de entrada</Label>
          <ToggleRow options={TIPO_ENTRADA} value={pd.tipo_entrada} onChange={(v) => patchPD({ tipo_entrada: v })} />
        </div>

        <div className="space-y-2">
          <Label>Como vai usar este tema?</Label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {INTENCOES_USO.map((opt) => {
              const active = pd.intencao_uso === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => patchPD({ intencao_uso: opt.v })}
                  className={cn(
                    "text-left p-3 rounded-md border transition-colors",
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50",
                  )}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <LabelRow onVoice={appendTo(conteudoRef, (v) => patchPD({ conteudo: v }))}>
            Descreva o que você viu, pensou ou percebeu
          </LabelRow>
          <Textarea
            ref={conteudoRef}
            defaultValue={pd.conteudo ?? ""}
            onChange={(e) => patchPD({ conteudo: e.target.value })}
            placeholder="Sem estrutura obrigatória. Escreva como você pensaria."
            rows={5}
          />
        </div>
      </Card>

      <Collapsible open={audienceOpen} onOpenChange={setAudienceOpen}>
        <Card>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left">
            <span className="text-sm font-medium">Inteligência de Audiência</span>
            {audienceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-2">
            <LabelRow onVoice={appendTo(audienciaRef, (v) => patchPD({ conteudo_audiencia: v }))}>
              Comentários da audiência
            </LabelRow>
            <Textarea
              ref={audienciaRef}
              defaultValue={pd.conteudo_audiencia ?? ""}
              onChange={(e) => patchPD({ conteudo_audiencia: e.target.value })}
              placeholder="Cole aqui comentários do TikTok, Instagram ou qualquer plataforma..."
              rows={5}
            />
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={seriesOpen} onOpenChange={setSeriesOpen}>
        <Card>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left">
            <span className="text-sm font-medium">Série</span>
            {seriesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSeriesMode("new")}
                className={cn(
                  "flex-1 p-3 rounded-md border text-sm font-medium transition-colors",
                  seriesMode === "new"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50",
                )}
              >
                ＋ Nova série
              </button>
              <button
                type="button"
                onClick={() => setSeriesMode("existing")}
                className={cn(
                  "flex-1 p-3 rounded-md border text-sm font-medium transition-colors",
                  seriesMode === "existing"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50",
                )}
              >
                → Continuar série existente
              </button>
            </div>

            {seriesMode === "new" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome da série</Label>
                  <Input
                    defaultValue={piece.series_name ?? ""}
                    onChange={(e) => queue({ series_name: e.target.value || null })}
                    placeholder="Ex: Comunicação não-violenta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de episódios planejados</Label>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={pd.serie_total_episodios as number | undefined ?? ""}
                    onChange={(e) =>
                      patchPD({ serie_total_episodios: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número deste episódio</Label>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={piece.series_position ?? ""}
                    onChange={(e) =>
                      queue({ series_position: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </div>
            )}

            {seriesMode === "existing" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Série existente</Label>
                  <Select
                    value={piece.series_name ?? ""}
                    onValueChange={(v) => queue({ series_name: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma série" />
                    </SelectTrigger>
                    <SelectContent>
                      {(seriesQ.data ?? []).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número deste episódio</Label>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={piece.series_position ?? ""}
                    onChange={(e) =>
                      queue({ series_position: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={callAI} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Leitura da IA
        </Button>
        <Button onClick={onAdvance}>Avançar para Estratégia</Button>
      </div>

      {pd.ia_leitura_fase1 && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide opacity-60">Energia sugerida</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              pd.ia_leitura_fase1.energia_sugerida === "topo" ? "bg-green-100 text-green-800" :
              pd.ia_leitura_fase1.energia_sugerida === "meio" ? "bg-blue-100 text-blue-800" :
              "bg-purple-100 text-purple-800"
            }`}>
              {pd.ia_leitura_fase1.energia_sugerida === "topo" ? "TOPO — identificação" :
               pd.ia_leitura_fase1.energia_sugerida === "meio" ? "MEIO — confiança clínica" :
               "FUNDO — reduzir resistência"}
            </span>
          </div>
          {pd.ia_leitura_fase1.observacao && (
            <div>
              <span className="text-xs font-medium opacity-60 block mb-1">O que este tema revela</span>
              <p className="text-sm leading-relaxed">{pd.ia_leitura_fase1.observacao}</p>
            </div>
          )}
          {pd.ia_leitura_fase1.caminho_narrativo && (
            <div>
              <span className="text-xs font-medium opacity-60 block mb-1">Caminho sugerido</span>
              <p className="text-sm leading-relaxed font-medium">{pd.ia_leitura_fase1.caminho_narrativo}</p>
            </div>
          )}
          {pd.ia_leitura_fase1.padroes_audiencia && (
            <div>
              <span className="text-xs font-medium opacity-60 block mb-1">Padrão da audiência</span>
              <p className="text-sm leading-relaxed">{pd.ia_leitura_fase1.padroes_audiencia}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Adicionar insight próprio (opcional)</Label>
        <div className="flex gap-2">
          <Textarea
            placeholder="Se nenhum caminho da IA serviu, escreva aqui o que você quer explorar..."
            rows={2}
            defaultValue={pd.insight_manual ?? ""}
            onChange={(e) => patchPD({ insight_manual: e.target.value })}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">Este insight será usado na geração de esboço junto com os selecionados.</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* PHASE 2 — ESTRATÉGIA                                               */
/* ================================================================== */

function Phase2({
  piece,
  pd,
  queue,
  flush,
  onAdvance,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onAdvance: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const patchPD = (p: Partial<PhaseData>) => queue({ phase_data: { ...pd, ...p } });
  const objetivoRef = useRef<HTMLTextAreaElement>(null);

  const metasSelecionadas: string[] = pd.metas_resultado ?? (pd.meta_resultado ? [pd.meta_resultado] : []);
  const metasSugeridas: string[] = pd.ia_validacao_fase2?.metas_sugeridas ?? [];

  const toggleMeta = (m: string) => {
    const set = new Set(metasSelecionadas);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    patchPD({ metas_resultado: Array.from(set) });
  };

  const callValidate = async (mode: "validar" | "sugerir") => {
    const setBusy = mode === "validar" ? setLoading : setSuggesting;
    setBusy(true);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "phase2_validate",
          payload: {
            tema: piece.theme,
            energia: piece.energia,
            creation_strategy: piece.creation_strategy,
            objetivo: pd.objetivo,
            metas_resultado: metasSelecionadas,
            intencao_uso: pd.intencao_uso,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.result ?? {};
      queue({ phase_data: { ...pd, ia_validacao_fase2: result } });
      await flush();
      toast.success(mode === "validar" ? "Validação pronta" : "Metas sugeridas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  };

  const appendObjetivo = (spoken: string) => {
    const el = objetivoRef.current;
    if (!el) return;
    const prev = el.value ?? "";
    const next = prev ? `${prev} ${spoken}`.trim() : spoken;
    el.value = next;
    patchPD({ objetivo: next });
  };

  const validacao = pd.ia_validacao_fase2;
  const aprovado = validacao?.aprovado_para_roteiro === true;
  const temMetasParaExibir = metasSugeridas.length > 0 || metasSelecionadas.length > 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-3">
        <Label>Energia</Label>
        <div className="grid md:grid-cols-3 gap-3">
          {ENERGIAS.map((e) => {
            const active = (piece.energia ?? "").toLowerCase() === e.v;
            return (
              <button
                key={e.v}
                type="button"
                onClick={() => queue({ energia: e.v })}
                className={cn(
                  "text-left p-4 rounded-md border transition-colors",
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50",
                )}
              >
                <div className="text-sm font-semibold mb-1">{e.label}</div>
                <div className="text-xs text-muted-foreground">{e.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <Label>Estratégia de criação</Label>
        <ToggleRow
          options={ESTRATEGIAS}
          value={piece.creation_strategy}
          onChange={(v) => queue({ creation_strategy: v })}
        />
      </Card>

      <Card className="p-6 space-y-3">
        <LabelRow onVoice={appendObjetivo}>Qual é o objetivo deste conteúdo?</LabelRow>
        <Textarea
          ref={objetivoRef}
          defaultValue={pd.objetivo ?? ""}
          onChange={(e) => patchPD({ objetivo: e.target.value })}
          placeholder="O que você quer que a pessoa sinta, perceba ou faça ao terminar?"
          rows={3}
        />
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Meta de resultado</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => callValidate("sugerir")}
            disabled={suggesting}
          >
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Sugerir metas com IA
          </Button>
        </div>

        {suggesting && !temMetasParaExibir ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : (
          <>
            {metasSugeridas.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Sugeridas pela IA</div>
                {metasSugeridas.map((m) => (
                  <label key={`s-${m}`} className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={metasSelecionadas.includes(m)}
                      onCheckedChange={() => toggleMeta(m)}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs uppercase text-muted-foreground">Opções fixas</div>
              {METAS_RESULTADO.map((m) => (
                <label key={m} className="flex items-start gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={metasSelecionadas.includes(m)}
                    onCheckedChange={() => toggleMeta(m)}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => callValidate("validar")} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Validar estratégia
        </Button>
        <Button onClick={onAdvance}>
          Avançar para Roteiro
        </Button>
      </div>

      {validacao && (
        <Card
          className={cn(
            "p-5 space-y-2 border",
            validacao.status === "alinhado"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="text-xs uppercase font-medium">
            {validacao.status === "alinhado" ? "Estratégia alinhada" : "Conflito detectado"}
          </div>
          {validacao.comentario && <p className="text-sm">{validacao.comentario}</p>}
          {validacao.sugestao && (
            <div className="text-sm border-t pt-2">
              <span className="text-xs uppercase text-muted-foreground mr-2">Sugestão:</span>
              {validacao.sugestao}
            </div>
          )}
        </Card>
      )}

      {validacao?.insights_estrategicos && validacao.insights_estrategicos.length > 0 && (
        <Card className="p-5 space-y-2 border border-sky-500/40 bg-sky-500/5">
          <div className="text-xs uppercase font-medium text-sky-700 dark:text-sky-300">
            Insights estratégicos
          </div>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {validacao.insights_estrategicos.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </Card>
      )}

      {validacao?.evitar && validacao.evitar.length > 0 && (
        <Card className="p-5 space-y-2 border border-red-500/40 bg-red-500/5">
          <div className="text-xs uppercase font-medium text-red-700 dark:text-red-300">
            Evitar neste conteúdo
          </div>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {validacao.evitar.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/* PHASE 3 — ROTEIRO                                                  */
/* ================================================================== */

const AJUSTES_PRESET = [
  "Gancho muito longo — comprimir",
  "Escrita muito formal — humanizar",
  "Falta microchoque — o conteúdo está linear",
  "Insight genérico — não gera descoberta",
  "Resolução fraca — não transforma",
  "Linguagem de coach detectada — corrigir",
  "CTA ausente ou fora do posicionamento",
];

const wordsAndSeconds = (text: string) => {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.round((words / 150) * 60); // ~150 ppm de fala
  return { words, seconds };
};

const papelLabel = (papel: string) => {
  const p = (papel ?? "").toLowerCase();
  if (p === "resolucao" || p === "resolução") return "Resolução / Transformação";
  if (p === "cta") return "CTA";
  return papel;
};

const withCta = (blocks: ScriptBlock[]): ScriptBlock[] => {
  if (!blocks || blocks.length === 0) return blocks;
  const hasCta = blocks.some((b) => (b.papel ?? "").toLowerCase() === "cta");
  if (hasCta) return blocks;
  return [...blocks, { papel: "cta", texto: "" }];
};

function Phase3({
  piece,
  pd,
  queue,
  flush,
  onAdvance,
  openTeleOnMount,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onAdvance: () => Promise<void>;
  openTeleOnMount?: boolean;
}) {
  const qc = useQueryClient();
  const [sub, setSub] = useState<"insights" | "topicos" | "roteiro" | "revisao">("insights");
  const [loading, setLoading] = useState<string | null>(null);
  const [teleOpen, setTeleOpen] = useState(false);
  const instrucaoRef = useRef<HTMLTextAreaElement>(null);
  const [targetSeconds, setTargetSeconds] = useState(90);

  useEffect(() => {
    if (openTeleOnMount) setTeleOpen(true);
  }, []);

  const patchPD = (p: Partial<PhaseData>) => queue({ phase_data: { ...pd, ...p } });

  const callAI = async (action: string, payload: Record<string, unknown>) => {
    setLoading(action);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: { action, payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.result ?? {};
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
      return null;
    } finally {
      setLoading(null);
    }
  };

  const templatesQ = useQuery({
    queryKey: ["script-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("script_templates").select("id,name,description,structure").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  // ── ETAPA 1: INSIGHTS ──
  const insights: Insight[] = pd.insights_gerados ?? [];
  const aprovados: Insight[] = pd.insights_aprovados ?? [];
  const isSelected = (id: string) => aprovados.some((i) => i.id === id);

  const gerarInsights = async () => {
    const result = await callAI("phase3_insights", {
      tema: piece.theme,
      energia: piece.energia,
      creation_strategy: piece.creation_strategy,
      objetivo: pd.objetivo,
      conteudo: pd.conteudo,
      insight_manual: pd.insight_manual ?? null,
      conteudo_audiencia: pd.conteudo_audiencia,
      ai_memory: piece.ai_memory,
      script_template: pd.template_selecionado ?? null,
    });
    if (!result) return;
    const ins: Insight[] = (result as { insights?: Insight[] }).insights ?? [];
    patchPD({ insights_gerados: ins });
    await flush();
  };

  const toggleInsight = (ins: Insight) => {
    if (!ins.id) return;
    const next = isSelected(ins.id)
      ? aprovados.filter((i) => i.id !== ins.id)
      : [...aprovados, ins];
    patchPD({ insights_aprovados: next });
  };

  // ── ETAPA 2: TÓPICOS ──
  const topicos: string[] = (pd.topicos_rascunho as string[] | undefined) ?? [];

  const gerarTopicos = async () => {
    const result = await callAI("phase3_insights", {
      tema: piece.theme,
      energia: piece.energia,
      creation_strategy: piece.creation_strategy,
      objetivo: pd.objetivo,
      conteudo: pd.conteudo,
      insight_manual: pd.insight_manual ?? null,
      insights_aprovados: aprovados,
      conteudo_audiencia: pd.conteudo_audiencia,
      ai_memory: piece.ai_memory,
      modo: "topicos",
    });
    if (!result) return;
    const ins = (result as { insights?: Insight[] }).insights ?? [];
    const topics = ins.map((i) => i.frase_semente ?? i.titulo_angulo ?? "").filter(Boolean);
    patchPD({ topicos_rascunho: topics.length > 0 ? topics : aprovados.map((i) => i.frase_semente ?? i.titulo_angulo ?? "") });
    await flush();
    toast.success("Tópicos gerados — edite antes de ir para o roteiro");
  };

  const atualizarTopico = (idx: number, valor: string) => {
    const next = [...topicos];
    next[idx] = valor;
    patchPD({ topicos_rascunho: next });
  };
  const adicionarTopico = () => patchPD({ topicos_rascunho: [...topicos, ""] });
  const removerTopico = (idx: number) => {
    const next = topicos.filter((_, i) => i !== idx);
    patchPD({ topicos_rascunho: next });
  };

  // ── ETAPA 3: ROTEIRO ──
  const withCta = (blocos: ScriptBlock[]): ScriptBlock[] => {
    if (blocos.some((b) => (b.papel ?? "").toLowerCase().includes("cta"))) return blocos;
    return [...blocos, { papel: "CTA", texto: "", nota_gravacao: "Chamada para ação — escreva manualmente" }];
  };

  const blocosRoteiro: ScriptBlock[] = withCta(pd.blocos_salvos_usuario ?? pd.blocos_editados ?? pd.blocos_rascunho ?? []);
  const totalSeconds = blocosRoteiro.reduce((acc, b) => acc + wordsAndSeconds(b.texto || "").seconds, 0);
  const tempoOk = totalSeconds >= 75 && totalSeconds <= 105;

  const gerarRoteiro = async () => {
    const result = await callAI("phase3_draft", {
      tema: piece.theme,
      energia: piece.energia,
      objetivo: pd.objetivo,
      conteudo: pd.conteudo,
      topicos_para_abordar: topicos,
      insights_aprovados: aprovados,
      script_template: pd.template_selecionado ?? null,
    });
    if (!result) return;
    const blocos: ScriptBlock[] = withCta((result as { blocos?: ScriptBlock[] }).blocos ?? []);
    patchPD({ blocos_rascunho: blocos, blocos_editados: blocos, blocos_salvos_usuario: blocos });
    await flush();
  };

  const editarBloco = (idx: number, texto: string) => {
    const next = withCta([...blocosRoteiro]);
    next[idx] = { ...next[idx], texto };
    patchPD({ blocos_editados: next, blocos_salvos_usuario: next });
  };

  const salvarRoteiro = async () => {
    patchPD({ blocos_salvos_usuario: blocosRoteiro });
    await flush();
    toast.success("Roteiro salvo");
  };

  // ── ETAPA 4: REVISÃO ──
  const blocosFinais: ScriptBlock[] = withCta(pd.blocos_salvos_usuario ?? pd.blocos_editados ?? pd.blocos_rascunho ?? []);
  const tempoFinalSeconds = blocosFinais.reduce((acc, b) => acc + wordsAndSeconds(b.texto || "").seconds, 0);

  const editarBlocoFinal = (idx: number, texto: string) => {
    const base = [...blocosFinais];
    base[idx] = { ...base[idx], texto };
    patchPD({ blocos_salvos_usuario: base });
  };

  const salvarBlocoFinal = async () => {
    patchPD({ blocos_salvos_usuario: blocosFinais });
    await flush();
    toast.success("Roteiro salvo");
  };

  const analisarRoteiro = async () => {
    const result = await callAI("phase3_review", {
      tema: piece.theme,
      energia: piece.energia,
      creation_strategy: piece.creation_strategy,
      objetivo: pd.objetivo,
      blocos_finais: blocosFinais,
      ai_memory: piece.ai_memory,
    });
    if (!result) return;
    const raw = result as Record<string, unknown>;
    const safe: ReviewIA = {
      score_retencao: typeof raw.score_retencao === "number" ? raw.score_retencao : undefined,
      estimativa: raw.estimativa as ReviewIA["estimativa"],
      pontos_fortes: (raw.pontos_fortes as string[] | undefined) ?? [],
      pontos_fracos: (raw.pontos_fracos as ReviewIA["pontos_fracos"]) ?? [],
      alerta_posicionamento: raw.alerta_posicionamento as string | undefined,
      comentario_final: raw.comentario_final as string | undefined,
    } as ReviewIA;
    patchPD({ revisao_ia: safe });
    await flush();
  };

  const sugerirCortes = async () => {
    const result = await callAI("phase3_adjust", {
      blocos_atuais: blocosFinais,
      ajustes_marcados: [],
      instrucao_livre: `Sugira quais trechos cortar para reduzir o roteiro para ${targetSeconds} segundos. Não reescreva — apenas mostre o texto resultante de cada bloco com os cortes aplicados.`,
    });
    if (!result) return;
    const r = result as { blocos_ajustados?: ScriptBlock[] };
    patchPD({ sugestao_cortes: { blocos: withCta(r.blocos_ajustados ?? []), target: targetSeconds } });
    await flush();
  };

  const usarVersaoCortada = async () => {
    const cortes = pd.sugestao_cortes?.blocos;
    if (!cortes) return;
    patchPD({ blocos_salvos_usuario: cortes, sugestao_cortes: undefined });
    await flush();
    toast.success("Versão com cortes salva");
  };

  const sugerirParaPontoFraco = async (ponto: string, correcao: string) => {
    const result = await callAI("phase3_adjust", {
      blocos_atuais: blocosFinais,
      ajustes_marcados: [ponto],
      instrucao_livre: correcao,
    });
    if (!result) return;
    const r = result as { blocos_ajustados?: ScriptBlock[] };
    patchPD({
      sugestoes_ponto_fraco: { ...(pd.sugestoes_ponto_fraco ?? {}), [ponto]: withCta(r.blocos_ajustados ?? []) },
    });
    await flush();
  };

  const aprovarSugestaoPontoFraco = async (ponto: string) => {
    const sugestao = pd.sugestoes_ponto_fraco?.[ponto];
    if (!sugestao?.length) return;
    const papeisModificados = new Set(sugestao.map((b) => b.papel));
    const next = blocosFinais.map((b) => {
      if (!papeisModificados.has(b.papel)) return b;
      return sugestao.find((s) => s.papel === b.papel) ?? b;
    });
    patchPD({ blocos_salvos_usuario: next });
    await flush();
    toast.success("Sugestão aprovada");
  };

  const aprovarRoteiro = async () => {
    const corrido = blocosFinais.map((b) => b.texto).join("\n\n");
    await flush();
    await supabase.from("content_pieces").update({ phase: 4, script: corrido } as never).eq("id", piece.id);
    qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    await onAdvance();
  };

  const salvarMulticonteudo = () => {
    patchPD({ insights_multiconteudo: aprovados });
    toast.success("Insights salvos para multiconteúdo");
  };

  const fontSize = piece.teleprompter_font_size ?? 32;
  const fontTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFont = (v: number) => {
    queue({ teleprompter_font_size: v });
    if (fontTimer.current) clearTimeout(fontTimer.current);
    fontTimer.current = setTimeout(flush, 500);
  };

  const subTabs = [
    { v: "insights" as const, label: "1. Insights" },
    { v: "topicos" as const, label: "2. Tópicos" },
    { v: "roteiro" as const, label: "3. Roteiro" },
    { v: "revisao" as const, label: "4. Revisão" },
  ];

  const ESTRUTURA_ROTEIRO = [
    { papel: "Hook", desc: "Frase que para — por ser verdadeira, não dramática" },
    { papel: "Contexto Emocional", desc: "Situar o que acontece. Emoção antes de informação." },
    { papel: "Microchoque", desc: "Virada que quebra o previsível. Desloca perspectiva." },
    { papel: "Insight de Descoberta", desc: "Percepção nova. Não é dica — é reconhecimento." },
    { papel: "Resolução / Transformação", desc: "Abre direção. Conecta à tese da série." },
    { papel: "CTA", desc: "Gera comentários — nunca venda direta." },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {subTabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setSub(t.v)}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
              sub === t.v ? "border-accent text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 1. INSIGHTS ── */}
      {sub === "insights" && (
        <div className="space-y-4">
          {(templatesQ.data ?? []).length > 0 && (
            <Card className="p-4 space-y-2">
              <Label className="text-xs">Usar modelo de roteiro como referência?</Label>
              <Select
                value={pd.template_selecionado ? JSON.stringify(pd.template_selecionado) : "__none__"}
                onValueChange={(v) => patchPD({ template_selecionado: v === "__none__" ? null : JSON.parse(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {(templatesQ.data ?? []).map((t: { id: string; name: string; structure: unknown }) => (
                    <SelectItem key={t.id} value={JSON.stringify(t.structure)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button onClick={gerarInsights} disabled={loading === "phase3_insights"}>
              {loading === "phase3_insights" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {insights.length > 0 ? "Regerar insights" : "Gerar insights"}
            </Button>
            {aprovados.length > 0 && (
              <Button variant="outline" onClick={() => setSub("topicos")}>
                Continuar com {aprovados.length} insight{aprovados.length > 1 ? "s" : ""} →
              </Button>
            )}
            {aprovados.length > 0 && (
              <Button variant="ghost" size="sm" onClick={salvarMulticonteudo}>
                Salvar para multiconteúdo
              </Button>
            )}
          </div>

          {loading === "phase3_insights" && (
            <div className="grid md:grid-cols-2 gap-3">
              {[1,2,3,4].map((i) => (
                <Card key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </Card>
              ))}
            </div>
          )}

          {loading !== "phase3_insights" && insights.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {insights.map((ins, idx) => {
                const id = ins.id ?? String(idx);
                const sel = isSelected(id);
                const insExt = ins as unknown as { revelacao?: string };
                return (
                  <Card key={id} className={cn("p-4 space-y-3 cursor-pointer transition-colors", sel ? "border-accent bg-accent/5" : "hover:border-accent/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm flex-1">{ins.titulo_angulo}</div>
                      {energiaBadge(ins.energia_sugerida)}
                    </div>
                    {ins.tensao && <p className="text-xs text-muted-foreground">{ins.tensao}</p>}
                    {ins.frase_semente && <p className="text-sm italic border-l-2 border-accent/40 pl-2">"{ins.frase_semente}"</p>}
                    {insExt.revelacao && (
                      <div className="text-xs bg-muted/50 rounded p-2">
                        <span className="font-medium">Revelação: </span>{insExt.revelacao}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer pt-2 border-t">
                      <Checkbox checked={sel} onCheckedChange={() => toggleInsight({ ...ins, id })} />
                      {sel ? "Selecionado ✓" : "Selecionar este insight"}
                    </label>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. TÓPICOS ── */}
      {sub === "topicos" && (
        <div className="space-y-4">
          <Card className="p-4 space-y-2 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Estes são os tópicos que precisam ser abordados no conteúdo — não o roteiro ainda. Edite, reordene, adicione ou remova antes de gerar o roteiro.
            </p>
            {aprovados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Insights aprovados:</span>
                {aprovados.map((i) => (
                  <Badge key={i.id} variant="outline" className="text-[10px]">{i.titulo_angulo}</Badge>
                ))}
              </div>
            )}
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={gerarTopicos} disabled={loading === "phase3_insights"}>
              {loading === "phase3_insights" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {topicos.length > 0 ? "Regerar tópicos" : "Gerar tópicos da IA"}
            </Button>
            <Button variant="ghost" size="sm" onClick={adicionarTopico}>
              + Adicionar tópico manualmente
            </Button>
          </div>

          {topicos.length > 0 && (
            <div className="space-y-2">
              {topicos.map((t, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="text-xs text-muted-foreground pt-2.5 w-5 shrink-0">{idx + 1}.</span>
                  <Textarea
                    value={t}
                    onChange={(e) => atualizarTopico(idx, e.target.value)}
                    rows={2}
                    placeholder={`Tópico ${idx + 1}...`}
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 mt-1 text-muted-foreground hover:text-destructive"
                    onClick={() => removerTopico(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {topicos.length === 0 && !loading && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Clique em "Gerar tópicos" ou adicione manualmente o que precisa ser dito neste conteúdo.
            </Card>
          )}

          {topicos.length > 0 && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={async () => {
                  patchPD({ topicos_rascunho: topicos });
                  await flush();
                  setSub("roteiro");
                }}
              >
                Ir para o roteiro →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 3. ROTEIRO ── */}
      {sub === "roteiro" && (
        <div className="space-y-4">
          <Card className="p-4 space-y-2 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estrutura do roteiro</p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {ESTRUTURA_ROTEIRO.map((e) => (
                <div key={e.papel} className="text-xs">
                  <span className="font-medium">{e.papel}: </span>
                  <span className="text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={gerarRoteiro} disabled={loading === "phase3_draft"}>
              {loading === "phase3_draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {blocosRoteiro.filter(b => b.texto).length > 0 ? "Regerar roteiro" : "Gerar roteiro"}
            </Button>
            {blocosRoteiro.filter(b => b.texto).length > 0 && (
              <Button variant="outline" onClick={salvarRoteiro}>
                Salvar roteiro
              </Button>
            )}
          </div>

          {blocosRoteiro.filter(b => b.texto).length > 0 && (
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Tempo total estimado</span>
                <span className={cn("font-semibold tabular-nums", tempoOk ? "text-emerald-600" : "text-amber-600")}>
                  {totalSeconds}s {tempoOk ? "✓ (~90s)" : "(ideal: 75-105s)"}
                </span>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div className={cn("h-full transition-all", tempoOk ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${Math.min(100, (totalSeconds / 105) * 100)}%` }} />
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {blocosRoteiro.map((b, idx) => {
              const { words, seconds } = wordsAndSeconds(b.texto || "");
              const estrutura = ESTRUTURA_ROTEIRO.find(e => e.papel === b.papel);
              return (
                <Card key={idx} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] uppercase">{papelLabel(b.papel)}</Badge>
                      {estrutura && <span className="text-[10px] text-muted-foreground ml-2">{estrutura.desc}</span>}
                    </div>
                    {b.texto && (
                      <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                        {words}p · ~{seconds}s
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={b.texto}
                    onChange={(e) => editarBloco(idx, e.target.value)}
                    rows={b.papel === "CTA" ? 2 : 3}
                    placeholder={(b.papel ?? "").toLowerCase() === "cta" ? "Escreva a chamada para ação — não use venda direta" : `Escreva o ${b.papel}...`}
                  />
                  {b.nota_gravacao && b.papel !== "CTA" && (
                    <p className="text-[11px] text-muted-foreground italic">↳ {b.nota_gravacao}</p>
                  )}
                </Card>
              );
            })}
          </div>

          {blocosRoteiro.filter(b => b.texto).length > 0 && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={async () => {
                  await salvarRoteiro();
                  setSub("revisao");
                }}
              >
                Salvar e ir para revisão →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. REVISÃO ── */}
      {sub === "revisao" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {blocosFinais.map((b, idx) => (
              <BlockReadEdit key={idx} block={b} onSave={(texto) => editarBlocoFinal(idx, texto)} />
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={salvarBlocoFinal}>
              Salvar roteiro
            </Button>
            <Button onClick={analisarRoteiro} disabled={loading === "phase3_review"}>
              {loading === "phase3_review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Análise da IA
            </Button>
            <Button variant="outline" onClick={() => setTeleOpen(true)}>
              <Play className="h-4 w-4" /> Teleprompter
            </Button>
            <Button onClick={aprovarRoteiro}>Roteiro aprovado → Produção</Button>
          </div>

          {pd.revisao_ia && (
            <ReviewCard
              r={pd.revisao_ia}
              sugestoes={pd.sugestoes_ponto_fraco ?? {}}
              loadingPonto={loading === "phase3_adjust"}
              onSugerirPonto={sugerirParaPontoFraco}
              onAprovarSugestao={aprovarSugestaoPontoFraco}
            />
          )}

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-medium">Cortar por tempo</div>
                <div className="text-xs text-muted-foreground">
                  Tempo atual: <span className="font-semibold tabular-nums">{tempoFinalSeconds}s</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Reduzir para</Label>
                <Input type="number" min={15} value={targetSeconds} onChange={(e) => setTargetSeconds(Number(e.target.value) || 0)} className="w-20" />
                <span className="text-xs text-muted-foreground">seg</span>
                <Button size="sm" variant="outline" onClick={sugerirCortes} disabled={loading === "phase3_adjust"}>
                  {loading === "phase3_adjust" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Sugerir cortes
                </Button>
              </div>
            </div>

            {pd.sugestao_cortes && (
              <div className="space-y-2 border-t pt-3">
                <div className="text-xs uppercase font-medium opacity-60">Original vs. com cortes (alvo {pd.sugestao_cortes.target}s)</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase opacity-60">Original</div>
                    {blocosFinais.map((b, i) => (
                      <Card key={i} className="p-2 text-xs space-y-1">
                        <Badge variant="outline" className="text-[9px]">{papelLabel(b.papel)}</Badge>
                        <p className="whitespace-pre-wrap">{b.texto}</p>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase opacity-60">Com cortes sugeridos</div>
                    {pd.sugestao_cortes.blocos?.map((b, i) => (
                      <Card key={i} className="p-2 text-xs space-y-1 border-accent/40">
                        <Badge variant="outline" className="text-[9px]">{papelLabel(b.papel)}</Badge>
                        <p className="whitespace-pre-wrap">{b.texto}</p>
                      </Card>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={usarVersaoCortada}>
                  Usar versão com cortes
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      <Teleprompter
        open={teleOpen}
        onOpenChange={setTeleOpen}
        text={blocosFinais.map((b) => b.texto).join("\n\n")}
        fontSize={fontSize}
        onFontChange={setFont}
      />
    </div>
  );
}


/* ================================================================== */
/* PHASE 4 — PRODUÇÃO                                                 */
/* ================================================================== */

const DEFAULT_EDIT_CHECKLIST: { label: string; done: boolean }[] = [
  { label: "Gravação concluída", done: false },
  { label: "Take escolhido", done: false },
  { label: "Edição finalizada", done: false },
  { label: "Legenda escrita", done: false },
  { label: "Thumbnail definida", done: false },
  { label: "Agendado ou publicado", done: false },
];

type Derivatives = {
  tiktok?: { script?: string; instrucao_gravacao?: string };
  carousel?: { slides?: { n: number; titulo: string; corpo: string }[] };
  stories?: { cards?: { n: number; tipo: string; texto: string; sugestao_visual?: string }[] };
  debate?: { legenda?: string; intencao?: string };
};

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=dom..6=sab
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Phase4({
  piece,
  pd,
  queue,
  flush,
  onAdvance,
  openTeleOnMount,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onAdvance: (publishedAt: string) => Promise<void>;
  openTeleOnMount?: boolean;
}) {
  const qc = useQueryClient();
  const [sub, setSub] = useState<"editorial" | "gravacao" | "pos">("editorial");
  const [teleOpen, setTeleOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    if (openTeleOnMount) setTeleOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { v: typeof sub; label: string }[] = [
    { v: "editorial", label: "Editorial" },
    { v: "gravacao", label: "Gravação" },
    { v: "pos", label: "Pós-produção" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setSub(t.v)}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
              sub === t.v
                ? "border-accent text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "editorial" && (
        <EditorialSub piece={piece} onAdvance={() => setSub("gravacao")} />
      )}

      {sub === "gravacao" && (
        <div className="space-y-4">
          <Card className="p-5 space-y-2">
            <Label>Roteiro aprovado</Label>
            <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3">
              {piece.script || "(roteiro vazio)"}
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <Label>Anotações pré-gravação</Label>
            <Textarea
              defaultValue={piece.pre_recording_notes ?? ""}
              onChange={(e) => queue({ pre_recording_notes: e.target.value })}
              placeholder="O que precisa preparar antes de gravar? Ex: confirmar enquadramento, separar exemplo clínico X"
              rows={4}
            />
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setTeleOpen(true)}>
              <Play className="h-4 w-4" />
              Abrir Teleprompter
            </Button>
            <Button
              size="lg"
              onClick={async () => {
                await flush();
                await supabase
                  .from("content_pieces")
                  .update({ pipeline_stage: "gravando" } as never)
                  .eq("id", piece.id);
                qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
                toast.success("Gravação registrada");
                setSub("pos");
              }}
            >
              ✓ Gravado
            </Button>
          </div>

          <Teleprompter
            open={teleOpen}
            onOpenChange={setTeleOpen}
            text={piece.script ?? ""}
            fontSize={piece.teleprompter_font_size ?? 32}
            onFontChange={(v) => queue({ teleprompter_font_size: v })}
          />
        </div>
      )}

      {sub === "pos" && (
        <PostProductionSub
          piece={piece}
          pd={pd}
          queue={queue}
          flush={flush}
          genLoading={genLoading}
          setGenLoading={setGenLoading}
          onReady={onAdvance}
        />
      )}
    </div>
  );
}

/* ---------- 4a EDITORIAL ---------- */
function EditorialSub({ piece, onAdvance }: { piece: Piece; onAdvance: () => void }) {
  const [refMonth, setRefMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const monthStart = new Date(refMonth);
  const monthEnd = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 0);

  const pieces = useQuery({
    queryKey: ["studio-pieces-month", refMonth.getFullYear(), refMonth.getMonth()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select("id,title,energia,planned_date,series_name")
        .eq("scope", "profissional")
        .gte("planned_date", ymd(monthStart))
        .lte("planned_date", ymd(monthEnd));
      if (error) throw error;
      return data ?? [];
    },
  });

  const pickDate = async (iso: string | null) => {
    const { error } = await supabase
      .from("content_pieces")
      .update({ planned_date: iso } as never)
      .eq("id", piece.id);
    if (error) toast.error(error.message);
    else {
      toast.success(iso ? "Data agendada" : "Data removida");
      pieces.refetch();
    }
  };

  // Build calendar grid (Mon-Sun)
  const firstDow = (monthStart.getDay() + 6) % 7; // 0..6 (0=Mon)
  const totalDays = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(refMonth.getFullYear(), refMonth.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const piecesByDay: Record<string, typeof pieces.data> = {};
  (pieces.data ?? []).forEach((p) => {
    if (!p.planned_date) return;
    (piecesByDay[p.planned_date] ??= []).push(p);
  });

  // Semana atual
  const today = new Date();
  const ws = startOfWeekMonday(today);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  const weekPieces = (pieces.data ?? []).filter((p) => {
    if (!p.planned_date) return false;
    return p.planned_date >= ymd(ws) && p.planned_date <= ymd(we);
  });
  const counts = { topo: 0, meio: 0, fundo: 0 } as Record<string, number>;
  weekPieces.forEach((p) => {
    const e = (p.energia ?? "").toLowerCase();
    if (counts[e] != null) counts[e]++;
  });

  const monthLabel = refMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const DOWS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRefMonth(new Date(refMonth.getFullYear(), refMonth.getMonth() - 1, 1))
            }
          >
            ← Mês anterior
          </Button>
          <div className="text-sm font-medium capitalize">{monthLabel}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRefMonth(new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1))
            }
          >
            Próximo mês →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
          {DOWS.map((d) => (
            <div key={d} className="text-center font-medium py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[80px]" />;
            const iso = ymd(d);
            const items = piecesByDay[iso] ?? [];
            const isToday = ymd(today) === iso;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[80px] rounded border p-1 text-[11px] space-y-1",
                  isToday ? "border-accent/60 bg-accent/5" : "border-border",
                )}
              >
                <div className="text-[10px] text-muted-foreground">{d.getDate()}</div>
                {items.map((it) => {
                  const isCurrent = it.id === piece.id;
                  const hasSeries = !!it.series_name;
                  return (
                    <div
                      key={it.id}
                      className={cn(
                        "rounded px-1 py-0.5 border bg-card truncate flex items-center gap-1",
                        isCurrent && "border-accent ring-1 ring-accent",
                        hasSeries && "border-dashed",
                      )}
                      title={it.title ?? ""}
                    >
                      {energiaBadge(it.energia)}
                      <span className="truncate">{it.title ?? "Sem título"}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Agendar esta peça para:</Label>
        <Input
          type="date"
          defaultValue={piece.planned_date ?? ""}
          onChange={(e) => pickDate(e.target.value || null)}
          className="max-w-xs"
        />
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Semana atual</div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700">
            {counts.topo} topo
          </Badge>
          <Badge variant="outline" className="bg-sky-500/10 text-sky-700">
            {counts.meio} meio
          </Badge>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
            {counts.fundo} fundo
          </Badge>
        </div>
        {counts.fundo === 0 && (
          <p className="text-xs text-muted-foreground">
            Sem peças de fundo na semana — considere equilibrar com pelo menos uma.
          </p>
        )}
      </Card>

      <Button onClick={onAdvance}>Ir para Gravação</Button>
    </div>
  );
}

/* ---------- 4c PÓS-PRODUÇÃO ---------- */
function PostProductionSub({
  piece,
  pd,
  queue,
  flush,
  genLoading,
  setGenLoading,
  onReady,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  genLoading: boolean;
  setGenLoading: (v: boolean) => void;
  onReady: (publishedAt: string) => Promise<void>;
}) {
  const checklist =
    (piece.editing_checklist && piece.editing_checklist.length > 0
      ? piece.editing_checklist
      : DEFAULT_EDIT_CHECKLIST);

  const toggleItem = (idx: number) => {
    const next = checklist.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    queue({ editing_checklist: next });
  };

  const derivativesParsed: Derivatives = useMemo(() => {
    const obj: Derivatives = {};
    if (piece.tiktok_script) {
      try {
        obj.tiktok = JSON.parse(piece.tiktok_script);
      } catch {
        obj.tiktok = { script: piece.tiktok_script };
      }
    }
    if (piece.carousel_script) {
      try {
        obj.carousel = JSON.parse(piece.carousel_script);
      } catch {
        obj.carousel = { slides: [] };
      }
    }
    if (piece.stories_script) {
      try {
        obj.stories = JSON.parse(piece.stories_script);
      } catch {
        obj.stories = { cards: [] };
      }
    }
    if (piece.debate_caption) {
      try {
        obj.debate = JSON.parse(piece.debate_caption);
      } catch {
        obj.debate = { legenda: piece.debate_caption };
      }
    }
    return obj;
  }, [piece.tiktok_script, piece.carousel_script, piece.stories_script, piece.debate_caption]);

  const generateDerivatives = async () => {
    setGenLoading(true);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "phase4_derivatives",
          payload: {
            tema: piece.theme,
            energia: piece.energia,
            creation_strategy: piece.creation_strategy,
            roteiro_final_texto: piece.script,
            insights_multiconteudo: pd.insights_multiconteudo ?? [],
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = (data?.result ?? {}) as Derivatives;
      queue({
        tiktok_script: r.tiktok ? JSON.stringify(r.tiktok) : null,
        carousel_script: r.carousel ? JSON.stringify(r.carousel) : null,
        stories_script: r.stories ? JSON.stringify(r.stories) : null,
        debate_caption: r.debate ? JSON.stringify(r.debate) : null,
      });
      await flush();
      toast.success("Derivados gerados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setGenLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const [captionDraft, setCaptionDraft] = useState(piece.caption ?? "");
  useEffect(() => {
    setCaptionDraft(piece.caption ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id]);
  const [captionOptions, setCaptionOptions] = useState<string[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);

  const generateCaptions = async () => {
    setCaptionLoading(true);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "generate_captions",
          payload: {
            tema: piece.theme,
            script: piece.script,
            energia: piece.energia,
            creation_strategy: piece.creation_strategy,
            ai_memory: piece.ai_memory,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = data?.result ?? {};
      const opts: string[] = [];
      if (r.opcao_1?.texto) opts.push(r.opcao_1.texto);
      if (r.opcao_2?.texto) opts.push(r.opcao_2.texto);
      if (opts.length === 0) throw new Error("IA não retornou legendas");
      setCaptionOptions(opts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setCaptionLoading(false);
    }
  };

  const [publishAt, setPublishAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [publishing, setPublishing] = useState(false);

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-3">
        <Label>Checklist de edição</Label>
        {checklist.map((it, i) => (
          <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={it.done} onCheckedChange={() => toggleItem(i)} />
            <span className={cn(it.done && "line-through text-muted-foreground")}>
              {it.label}
            </span>
          </label>
        ))}
      </Card>

      <Card className="p-5 space-y-2">
        <Label>Notas de edição</Label>
        <Textarea
          defaultValue={piece.editing_notes ?? ""}
          onChange={(e) => queue({ editing_notes: e.target.value })}
          rows={3}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Legenda do post</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={generateCaptions}
            disabled={captionLoading}
          >
            {captionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {captionOptions.length > 0 || piece.caption ? "Regerar legendas" : "Gerar 2 opções de legenda com IA"}
          </Button>
        </div>

        {captionOptions.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {captionOptions.map((opt, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{opt}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCaptionDraft(opt);
                    queue({ caption: opt });
                    setCaptionOptions([]);
                  }}
                >
                  Usar esta legenda
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Textarea
            value={captionDraft}
            onChange={(e) => {
              setCaptionDraft(e.target.value);
              queue({ caption: e.target.value });
            }}
            rows={5}
            placeholder="Escreva a legenda final ou gere opções com IA acima"
            className="pr-11"
          />
          <div className="absolute right-1.5 top-1.5">
            <MicButton value={captionDraft} onChange={(v) => { setCaptionDraft(v); queue({ caption: v }); }} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div>
          <div className="text-base font-semibold">Multiplicar conteúdo</div>
          <p className="text-xs text-muted-foreground">
            Cada formato explora um ângulo diferente do mesmo tema — não uma repetição, mas uma conversa nova.
          </p>
        </div>
        <Button onClick={generateDerivatives} disabled={genLoading}>
          {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Gerar todos os derivados
        </Button>

        <DerivativeBlock title="TikTok" hasData={!!derivativesParsed.tiktok}>
          {derivativesParsed.tiktok && (
            <div className="space-y-2">
              <div className="text-sm whitespace-pre-wrap">{derivativesParsed.tiktok.script}</div>
              {derivativesParsed.tiktok.instrucao_gravacao && (
                <div className="text-xs text-muted-foreground italic">
                  ↳ {derivativesParsed.tiktok.instrucao_gravacao}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => copy(derivativesParsed.tiktok?.script ?? "")}>
                Copiar script
              </Button>
            </div>
          )}
        </DerivativeBlock>

        <DerivativeBlock title="Carrossel" hasData={!!derivativesParsed.carousel}>
          {derivativesParsed.carousel?.slides && (
            <div className="space-y-3">
              {derivativesParsed.carousel.slides.map((s) => (
                <div key={s.n} className="border rounded p-3">
                  <div className="text-xs text-muted-foreground mb-1">Slide {s.n}</div>
                  <div className="text-sm font-medium">{s.titulo}</div>
                  <div className="text-sm whitespace-pre-wrap">{s.corpo}</div>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copy(
                    (derivativesParsed.carousel?.slides ?? [])
                      .map((s) => `Slide ${s.n}\n${s.titulo}\n${s.corpo}`)
                      .join("\n\n"),
                  )
                }
              >
                Copiar todos os slides
              </Button>
            </div>
          )}
        </DerivativeBlock>

        <DerivativeBlock title="Stories" hasData={!!derivativesParsed.stories}>
          {derivativesParsed.stories?.cards && (
            <div className="space-y-3">
              {derivativesParsed.stories.cards.map((c) => (
                <div key={c.n} className="border rounded p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {c.n}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {c.tipo}
                    </Badge>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{c.texto}</div>
                  {c.sugestao_visual && (
                    <div className="text-xs text-muted-foreground italic">
                      visual: {c.sugestao_visual}
                    </div>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copy(
                    (derivativesParsed.stories?.cards ?? [])
                      .map((c) => `[${c.n} · ${c.tipo}] ${c.texto}`)
                      .join("\n\n"),
                  )
                }
              >
                Copiar
              </Button>
            </div>
          )}
        </DerivativeBlock>

        <DerivativeBlock title="Legenda de debate" hasData={!!derivativesParsed.debate}>
          {derivativesParsed.debate && (
            <div className="space-y-2">
              <div className="text-sm whitespace-pre-wrap">{derivativesParsed.debate.legenda}</div>
              {derivativesParsed.debate.intencao && (
                <div className="text-xs text-muted-foreground italic">
                  Intenção: {derivativesParsed.debate.intencao}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => copy(derivativesParsed.debate?.legenda ?? "")}>
                Copiar
              </Button>
            </div>
          )}
        </DerivativeBlock>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={async () => {
              queue({ pipeline_stage: "pronto_postar" });
              await flush();
              toast.success("Marcado como pronto para postar");
            }}
          >
            Pronto para postar
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Data e hora de publicação</Label>
          <Input
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Button
          size="lg"
          disabled={publishing}
          onClick={async () => {
            setPublishing(true);
            try {
              const iso = new Date(publishAt).toISOString();
              await onReady(iso);
              toast.success("Publicação confirmada");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Falha");
            } finally {
              setPublishing(false);
            }
          }}
        >
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirmar publicação
        </Button>
      </Card>
    </div>
  );
}

function DerivativeBlock({
  title,
  hasData,
  children,
}: {
  title: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("border rounded", !hasData && "opacity-50")}>
        <CollapsibleTrigger
          disabled={!hasData}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <span className="text-sm font-medium">{title}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* PHASE 5 — DESEMPENHO                                                */
/* ------------------------------------------------------------------ */

type MetricsRow = {
  id?: string;
  piece_id: string;
  measured_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  dms_recebidos: number;
  agendamentos: number;
};

type MetricsExtras = {
  visualizacoes?: number;
  seguidores_alcancados?: number;
  nao_seguidores_alcancados?: number;
  novos_seguidores?: number;
  contas_engajamento?: number;
};

type MetricKey =
  | "views"
  | "reach"
  | "seguidores_alcancados"
  | "nao_seguidores_alcancados"
  | "novos_seguidores"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "contas_engajamento"
  | "dms_recebidos"
  | "agendamentos";

function Phase5({
  piece,
  pd,
  queue,
  flush,
  onOpenPiece,
  onBack,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (patch: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onOpenPiece: (id: string) => void;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const metricsQ = useQuery({
    queryKey: ["studio-metrics", piece.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_metrics")
        .select("*")
        .eq("piece_id", piece.id)
        .order("measured_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as unknown as MetricsRow) ?? null;
    },
  });

  const [m, setM] = useState<MetricsRow>({
    piece_id: piece.id,
    measured_at: today,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: 0,
    dms_recebidos: 0,
    agendamentos: 0,
  });
  const [extras, setExtras] = useState<MetricsExtras>(
    (pd.metricas_extras as MetricsExtras) ?? {},
  );
  const [autoFilled, setAutoFilled] = useState<Set<MetricKey>>(new Set());

  useEffect(() => {
    if (metricsQ.data) setM({ ...metricsQ.data });
  }, [metricsQ.data?.id]);

  const updateM = (key: keyof MetricsRow, value: number) => {
    setM((prev) => ({ ...prev, [key]: value }));
    setAutoFilled((prev) => {
      if (!prev.has(key as MetricKey)) return prev;
      const next = new Set(prev);
      next.delete(key as MetricKey);
      return next;
    });
  };
  const updateExtra = (key: keyof MetricsExtras, value: number) => {
    setExtras((prev) => ({ ...prev, [key]: value }));
    setAutoFilled((prev) => {
      if (!prev.has(key as MetricKey)) return prev;
      const next = new Set(prev);
      next.delete(key as MetricKey);
      return next;
    });
  };

  const [savingMetrics, setSavingMetrics] = useState(false);
  const saveMetrics = async () => {
    setSavingMetrics(true);
    try {
      const payload = { ...m, piece_id: piece.id, measured_at: today };
      if (m.id) {
        const { error } = await supabase.from("content_metrics").update(payload as never).eq("id", m.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("content_metrics")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        setM((prev) => ({ ...prev, id: (data as { id: string }).id }));
      }
      queue({ phase_data: { ...pd, metricas_extras: extras } });
      await flush();
      toast.success("Métricas salvas");
      qc.invalidateQueries({ queryKey: ["studio-metrics", piece.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSavingMetrics(false);
    }
  };

  // Upload image and analyze
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = async (file: File) => {
    setImageAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // strip data:...;base64, prefix
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "analyze_instagram_image",
          payload: { image_base64: base64, image_type: file.type },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = (data?.result ?? {}) as Record<string, number | undefined>;
      const filled = new Set<MetricKey>();
      const num = (v: unknown): number | undefined =>
        typeof v === "number" && !Number.isNaN(v) ? v : undefined;

      setM((prev) => {
        const next = { ...prev };
        const mapDb: [keyof MetricsRow, string][] = [
          ["views", "visualizacoes"],
          ["reach", "contas_alcancadas"],
          ["likes", "likes"],
          ["comments", "comments"],
          ["saves", "saves"],
          ["shares", "shares"],
          ["dms_recebidos", "dms_recebidos"],
          ["agendamentos", "agendamentos"],
        ];
        for (const [dbKey, apiKey] of mapDb) {
          const v = num(r[apiKey]);
          if (v !== undefined) {
            (next as Record<string, unknown>)[dbKey as string] = v;
            filled.add(dbKey as MetricKey);
          }
        }
        return next;
      });
      setExtras((prev) => {
        const next = { ...prev };
        const mapEx: (keyof MetricsExtras)[] = [
          "visualizacoes",
          "seguidores_alcancados",
          "nao_seguidores_alcancados",
          "novos_seguidores",
          "contas_engajamento",
        ];
        for (const k of mapEx) {
          const v = num(r[k]);
          if (v !== undefined) {
            next[k] = v;
            filled.add(k as MetricKey);
          }
        }
        return next;
      });
      setAutoFilled(filled);
      toast.success(`${filled.size} métricas preenchidas via imagem`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar imagem");
    } finally {
      setImageAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const comentarios = (pd.comentarios_recebidos as string) ?? "";

  const [showHistory, setShowHistory] = useState(false);
  const historyQ = useQuery({
    queryKey: ["studio-published-history"],
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select("id,title,published_at,energia,series_name,series_position,performance_analysis")
        .eq("status", "publicado")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (Pick<Piece, "id" | "title" | "published_at" | "energia" | "series_name" | "series_position" | "performance_analysis">)[];
    },
  });

  const [analyzing, setAnalyzing] = useState(false);
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await flush();
      const last3 = (historyQ.data ?? [])
        .filter((h) => h.id !== piece.id)
        .slice(0, 3)
        .map((h) => ({ title: h.title, energia: h.energia }));
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "phase5_performance",
          payload: {
            tema: piece.theme,
            energia: piece.energia,
            objetivo: pd.objetivo,
            roteiro_texto: piece.script,
            series_name: piece.series_name,
            series_position: piece.series_position,
            metricas: {
              views: m.views,
              likes: m.likes,
              comments: m.comments,
              shares: m.shares,
              saves: m.saves,
              reach: m.reach,
              dms: m.dms_recebidos,
              appointments: m.agendamentos,
              ...extras,
            },
            historico_resumo: last3,
            comentarios,
            ai_memory: piece.ai_memory,
          },
        },
      });
      if (error) throw new Error(error.message ?? "Erro na edge function");
      if (!data) throw new Error("Sem resposta da IA");
      if (data.error) throw new Error(data.error);
      const result = (data as { result: PerformanceAnalysis }).result;
      if (!result) throw new Error("Resposta da IA inválida");
      const newMemory = Array.isArray(piece.ai_memory) ? [...piece.ai_memory] : [];
      if (result.memoria_entrada) newMemory.push(result.memoria_entrada);
      const trimmed = newMemory.slice(-20);
      await supabase
        .from("content_pieces")
        .update({ performance_analysis: result as unknown, ai_memory: trimmed as unknown } as never)
        .eq("id", piece.id);
      qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
      toast.success("Análise gerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar");
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = piece.performance_analysis;

  const createReuseMut = useMutation({
    mutationFn: async (override?: { theme?: string; title?: string }) => {
      const { data, error } = await supabase
        .from("content_pieces")
        .insert({
          title: override?.title ?? ((piece.title ?? "Nova peça") + " (novo ângulo)"),
          theme: override?.theme ?? ((piece.theme ?? "") + " (novo ângulo)"),
          phase: 1,
          status: "ideia",
          scope: "profissional",
          parent_piece_id: piece.id,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["studio-pieces"] });
      onOpenPiece(id);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const SECTIONS: { title: string; fields: { key: MetricKey; label: string; source: "db" | "extra"; highlight?: boolean }[] }[] = [
    {
      title: "Alcance e visualizações",
      fields: [
        { key: "views", label: "Visualizações", source: "db" },
        { key: "reach", label: "Contas alcançadas", source: "db" },
        { key: "seguidores_alcancados", label: "Seguidores alcançados", source: "extra" },
        { key: "nao_seguidores_alcancados", label: "Não seguidores alcançados", source: "extra" },
        { key: "novos_seguidores", label: "Novos seguidores", source: "extra" },
      ],
    },
    {
      title: "Engajamento",
      fields: [
        { key: "likes", label: "Curtidas", source: "db" },
        { key: "comments", label: "Comentários", source: "db" },
        { key: "saves", label: "Salvamentos", source: "db" },
        { key: "shares", label: "Compartilhamentos", source: "db" },
        { key: "contas_engajamento", label: "Contas com engajamento", source: "extra" },
      ],
    },
    {
      title: "Conversão (mais valiosas)",
      fields: [
        { key: "dms_recebidos", label: "DMs recebidos", source: "db", highlight: true },
        { key: "agendamentos", label: "Agendamentos realizados", source: "db", highlight: true },
      ],
    },
  ];

  const getValue = (f: { key: MetricKey; source: "db" | "extra" }): number => {
    if (f.source === "db") return (m[f.key as keyof MetricsRow] as number) ?? 0;
    return (extras[f.key as keyof MetricsExtras] as number) ?? 0;
  };
  const setValue = (f: { key: MetricKey; source: "db" | "extra" }, v: number) => {
    if (f.source === "db") updateM(f.key as keyof MetricsRow, v);
    else updateExtra(f.key as keyof MetricsExtras, v);
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-medium text-base">{piece.title ?? "Sem título"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {piece.published_at
                ? `publicado em ${new Date(piece.published_at).toLocaleString("pt-BR")}`
                : "ainda não publicado"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {energiaBadge(piece.energia)}
            {piece.creation_strategy && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {piece.creation_strategy}
              </Badge>
            )}
            {piece.series_name && (
              <Badge variant="outline" className="text-[10px]">
                {piece.series_name}
                {piece.series_position ? ` · ep ${piece.series_position}` : ""}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Métricas */}
      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Registrar métricas</h3>

        {/* Upload */}
        <div className="border-2 border-dashed rounded-lg p-4 space-y-2 bg-muted/20">
          <div className="text-sm font-medium">Envie o print do Instagram Insights</div>
          <p className="text-xs text-muted-foreground">
            A IA lê a imagem e preenche os campos abaixo automaticamente.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={imageAnalyzing}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {imageAnalyzing ? "Analisando imagem…" : "Enviar print do Insights"}
          </Button>
        </div>

        {SECTIONS.map((sec) => (
          <div key={sec.title} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sec.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sec.fields.map((f) => {
                const filled = autoFilled.has(f.key);
                return (
                  <div
                    key={f.key}
                    className={cn(
                      "space-y-1 rounded-md",
                      f.highlight && "border-2 border-accent p-2",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">{f.label}</Label>
                      {filled && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          via imagem
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={getValue(f)}
                      onChange={(e) => setValue(f, Number(e.target.value) || 0)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <Button onClick={saveMetrics} disabled={savingMetrics}>
          {savingMetrics && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar métricas
        </Button>
      </Card>

      {/* Comentários */}
      <Card className="p-5 space-y-2">
        <h3 className="font-medium">Comentários recebidos</h3>
        <Textarea
          rows={5}
          placeholder="Cole aqui comentários relevantes que recebeu neste post"
          defaultValue={comentarios}
          onChange={(e) =>
            queue({ phase_data: { ...pd, comentarios_recebidos: e.target.value } })
          }
        />
      </Card>

      {/* Análise IA */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-medium">Análise de desempenho pela IA</h3>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analisar com IA
          </Button>
        </div>

        {analysis && (
          <div className="space-y-3">
            {analysis.o_que_funcionou && analysis.o_que_funcionou.length > 0 && (
              <Card className="p-4 border-green-500/40 bg-green-500/5 space-y-2">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400">O que funcionou</h4>
                <ul className="space-y-1.5 text-sm">
                  {analysis.o_que_funcionou.map((it, i) => (
                    <li key={i}>
                      <strong>{it.ponto}</strong>
                      <span className="text-muted-foreground"> — {it.razao}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {analysis.o_que_nao_funcionou && analysis.o_que_nao_funcionou.length > 0 && (
              <Card className="p-4 border-orange-500/40 bg-orange-500/5 space-y-2">
                <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400">O que não funcionou</h4>
                <ul className="space-y-2 text-sm">
                  {analysis.o_que_nao_funcionou.map((it, i) => (
                    <li key={i}>
                      <strong>{it.ponto}</strong>
                      <div className="text-muted-foreground text-xs">Hipótese: {it.hipotese}</div>
                      <div className="text-muted-foreground text-xs">Correção: {it.correcao}</div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {analysis.proximos_conteudos && (
              <Card className="p-4 border-blue-500/40 bg-blue-500/5 space-y-1">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">Para os próximos conteúdos</h4>
                <p className="text-sm">{analysis.proximos_conteudos}</p>
              </Card>
            )}
            {analysis.comparacao_posts && (
              <Card className="p-4 bg-muted/40 space-y-1">
                <h4 className="text-sm font-medium">Comparando com posts anteriores</h4>
                <p className="text-sm">{analysis.comparacao_posts}</p>
              </Card>
            )}
            {analysis.serie_proxima_sugestao && (
              <Card className="p-4 border-purple-500/40 bg-purple-500/5 space-y-1">
                <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400">Próximo episódio sugerido</h4>
                <p className="text-sm">{analysis.serie_proxima_sugestao}</p>
              </Card>
            )}
            {analysis.comentarios_para_conteudo && analysis.comentarios_para_conteudo.length > 0 && (
              <Card className="p-4 space-y-2">
                <h4 className="text-sm font-medium">Comentários que pedem conteúdo de resposta</h4>
                <ul className="space-y-2 text-sm">
                  {analysis.comentarios_para_conteudo.map((c, i) => (
                    <li key={i}>
                      <button
                        onClick={() =>
                          createReuseMut.mutate({
                            theme: c.tema_sugerido,
                            title: c.tema_sugerido,
                          })
                        }
                        disabled={createReuseMut.isPending}
                        className="w-full text-left p-2 border rounded hover:border-accent transition-colors"
                      >
                        <div className="italic text-muted-foreground text-xs">"{c.comentario}"</div>
                        <div className="text-sm font-medium mt-1 flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Criar peça: {c.tema_sugerido}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {analysis.reuso_sugerido && (
              <Button
                variant="outline"
                onClick={() => createReuseMut.mutate(undefined)}
                disabled={createReuseMut.isPending}
              >
                <Plus className="h-4 w-4" />
                Criar novo conteúdo a partir deste
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="pt-6 border-t mt-6">
        <Button
          className="w-full"
          onClick={async () => {
            await flush();
            toast.success("Desempenho salvo");
            onBack();
          }}
        >
          ✓ Salvar e voltar para o Studio
        </Button>
      </div>

      {/* Histórico */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Histórico de peças</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)}>
            {showHistory ? "Ocultar" : "Arquivo — todos os posts publicados"}
          </Button>
        </div>
        {showHistory && (
          <div className="space-y-2">
            {historyQ.isLoading && <Skeleton className="h-12 w-full" />}
            {(historyQ.data ?? []).length === 0 && !historyQ.isLoading && (
              <p className="text-sm text-muted-foreground italic">Nenhuma peça publicada ainda.</p>
            )}
            {(historyQ.data ?? []).map((it) => {
              const pa = it.performance_analysis as PerformanceAnalysis | null;
              const score = pa?.o_que_funcionou?.length ?? null;
              return (
                <button
                  key={it.id}
                  onClick={() => onOpenPiece(it.id)}
                  className="w-full text-left p-3 border rounded-md hover:border-accent transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{it.title ?? "Sem título"}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.published_at
                        ? new Date(it.published_at).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {energiaBadge(it.energia)}
                    {it.series_name && (
                      <Badge variant="outline" className="text-[10px]">
                        {it.series_name}
                        {it.series_position ? ` · ep ${it.series_position}` : ""}
                      </Badge>
                    )}
                    {score !== null && (
                      <Badge variant="outline" className="text-[10px]">
                        score {score}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================================================================== */
/* STORIES VIEW                                                       */
/* ================================================================== */

const STORY_TYPES = [
  "Bastidores",
  "Rotina",
  "Reflexão",
  "Dica clínica",
  "Pergunta para audiência",
  "Teaser de conteúdo",
  "Outro",
];

type StorySlot = { tipo: string; texto: string; done: boolean };

const emptySlots = (): StorySlot[] =>
  Array.from({ length: 5 }, () => ({ tipo: "Bastidores", texto: "", done: false }));

function StoriesView({ pieces, onBack }: { pieces: Piece[]; onBack: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const planQ = useQuery({
    queryKey: ["story-plan", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_story_plans")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { date: string; slots: StorySlot[] } | null;
    },
  });

  const [slots, setSlots] = useState<StorySlot[]>(emptySlots());
  useEffect(() => {
    if (planQ.data?.slots && Array.isArray(planQ.data.slots) && planQ.data.slots.length === 5) {
      setSlots(planQ.data.slots as StorySlot[]);
    }
  }, [planQ.data]);

  const saveSlots = async (next: StorySlot[]) => {
    setSlots(next);
    await supabase
      .from("daily_story_plans")
      .upsert({ date: today, slots: next as unknown as never } as never, { onConflict: "date" });
    qc.invalidateQueries({ queryKey: ["story-plan", today] });
    qc.invalidateQueries({ queryKey: ["story-week"] });
  };

  // saveSlots wrapped with debounce for text changes
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = (next: StorySlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSlots(next);
    }, 600);
  };

  const updateSlot = (i: number, patch: Partial<StorySlot>, debounce = false) => {
    const next = slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    if (debounce) queueSave(next);
    else void saveSlots(next);
  };

  // Suggest with AI
  const [suggesting, setSuggesting] = useState(false);
  const suggestStories = async () => {
    setSuggesting(true);
    try {
      // Energia da semana: distribuição de energia das peças com planned_date nesta semana
      const start = startOfWeekMondayLocal(new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const weekPieces = pieces.filter((p) => {
        if (!p.planned_date) return false;
        const d = new Date(p.planned_date);
        return d >= start && d < end;
      });
      const energiaSemana = weekPieces.reduce<Record<string, number>>((acc, p) => {
        const k = p.energia ?? "—";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      const ultimosTemas = weekPieces.slice(0, 3).map((p) => p.theme ?? p.title ?? "");

      // Histórico stories últimos 7 dias
      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 7);
      const sevenAgoStr = sevenAgo.toISOString().slice(0, 10);
      const { data: histRows } = await supabase
        .from("daily_story_plans")
        .select("date,slots")
        .gte("date", sevenAgoStr)
        .order("date", { ascending: false });
      const historicoStories = (histRows ?? []).map((r) => {
        const sArr = (r.slots as unknown as StorySlot[]) ?? [];
        return {
          date: r.date,
          done: sArr.filter((s) => s.done).map((s) => ({ tipo: s.tipo, texto: s.texto })),
        };
      });

      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "suggest_stories",
          payload: {
            data: today,
            energia_semana: energiaSemana,
            ultimos_temas: ultimosTemas,
            historico_stories: historicoStories,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const sugestoes = (data?.result?.sugestoes ?? []) as { slot: number; tipo: string; sugestao: string }[];
      if (sugestoes.length === 0) throw new Error("IA não retornou sugestões");
      const next = slots.map((s, i) => {
        const sug = sugestoes.find((x) => x.slot === i + 1) ?? sugestoes[i];
        if (!sug) return s;
        return {
          ...s,
          tipo: STORY_TYPES.includes(sug.tipo) ? sug.tipo : s.tipo,
          texto: s.texto || sug.sugestao,
        };
      });
      await saveSlots(next);
      toast.success("Sugestões aplicadas — ajuste à sua voz");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setSuggesting(false);
    }
  };

  // Week archive
  const [showWeek, setShowWeek] = useState(false);
  const weekQ = useQuery({
    queryKey: ["story-week"],
    enabled: showWeek,
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("daily_story_plans")
        .select("date,slots")
        .gte("date", startStr)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { date: string; slots: StorySlot[] }[];
    },
  });

  const weekDays = useMemo(() => {
    const days: { date: string; label: string; done: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = d.toISOString().slice(0, 10);
      const row = (weekQ.data ?? []).find((r) => r.date === ymd);
      const slotsArr = (row?.slots as unknown as StorySlot[]) ?? [];
      const done = slotsArr.filter((s) => s.done).length;
      const total = slotsArr.length || 5;
      const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
      days.push({ date: ymd, label, done, total });
    }
    return days;
  }, [weekQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          📱 Stories — {todayLabel}
        </h1>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-medium">Plano do dia</h3>
          <Button variant="outline" size="sm" onClick={suggestStories} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Sugerir ideias de stories com IA
          </Button>
        </div>

        <div className="space-y-3">
          {slots.map((s, i) => (
            <div
              key={i}
              className={cn(
                "border rounded-lg p-3 space-y-2 transition-all relative",
                s.done && "opacity-60 bg-muted/30",
              )}
            >
              {s.done && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <Select value={s.tipo} onValueChange={(v) => updateSlot(i, { tipo: v })}>
                  <SelectTrigger className="w-auto h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Textarea
                  value={s.texto}
                  onChange={(e) => updateSlot(i, { texto: e.target.value }, true)}
                  placeholder="O que você quer mostrar/dizer neste story?"
                  rows={2}
                  className="pr-11"
                />
                <div className="absolute right-1.5 top-1.5">
                  <MicButton
                    value={s.texto}
                    onChange={(v) => updateSlot(i, { texto: v })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={s.done}
                  onCheckedChange={(v) => updateSlot(i, { done: v === true })}
                />
                Feito
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Arquivo de stories</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowWeek((s) => !s)}>
            {showWeek ? "Ocultar" : "Ver semana"}
          </Button>
        </div>
        {showWeek && (
          <div className="space-y-2">
            {weekQ.isLoading && <Skeleton className="h-12 w-full" />}
            {!weekQ.isLoading &&
              weekDays.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between p-3 border rounded-md text-sm"
                >
                  <span className="capitalize">{d.label}</span>
                  <span
                    className={cn(
                      "font-medium",
                      d.done === 0 && "text-muted-foreground",
                      d.done > 0 && d.done < d.total && "text-amber-600",
                      d.done >= d.total && "text-emerald-600",
                    )}
                  >
                    {d.done}/{d.total} {d.done > 0 && "✓"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function startOfWeekMondayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/* ------------------------------------------------------------------ */
/* CALENDÁRIO EDITORIAL                                               */
/* ------------------------------------------------------------------ */

function CalendarioEditorial({
  pieces,
  seriesList,
  onBack,
  onOpenPiece,
  onRefresh,
}: {
  pieces: Piece[];
  seriesList: { id: string; name: string; total_episodes_planned: number | null }[];
  onBack: () => void;
  onOpenPiece: (id: string, phase?: number) => void;
  onRefresh: () => void;
}) {
  const [refMonth, setRefMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [filterSeries, setFilterSeries] = useState<string>("todas");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [batchOpen, setBatchOpen] = useState(false);

  const monthStart = new Date(refMonth);
  const monthEnd = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 0);
  const monthLabel = refMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstDow = (monthStart.getDay() + 6) % 7;
  const totalDays = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(refMonth.getFullYear(), refMonth.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const DOWS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const monthPieces = pieces.filter((p) => {
    const d = p.planned_date ?? p.published_at;
    if (!d) return false;
    if (d < ymd(monthStart) || d > ymd(monthEnd)) return false;
    if (filterSeries === "__avulso") {
      if (p.series_name) return false;
    } else if (filterSeries !== "todas" && p.series_name !== filterSeries) {
      return false;
    }
    if (filterStatus === "planejados" && p.status === "publicado") return false;
    if (filterStatus === "publicados" && p.status !== "publicado") return false;
    return true;
  });

  const byDay: Record<string, Piece[]> = {};
  monthPieces.forEach((p) => {
    const k = p.planned_date ?? p.published_at ?? "";
    if (k) (byDay[k] ??= []).push(p);
  });

  const pieceBg = (p: Piece) => {
    if (p.status === "publicado") return "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30";
    if ((p.phase ?? 1) >= 4) return "bg-blue-100 border-blue-300 dark:bg-blue-900/30";
    if ((p.phase ?? 1) === 3) return "bg-amber-100 border-amber-300 dark:bg-amber-900/30";
    return "bg-muted border-border";
  };
  const phaseLabel = (p: Piece) => {
    if (p.status === "publicado") return "✓";
    if (p.pipeline_stage === "pronto_postar") return "📤";
    if ((p.phase ?? 1) >= 4) return "🎬";
    if ((p.phase ?? 1) === 3) return "📝";
    return "💡";
  };

  const totalMes = monthPieces.length;
  const publicados = monthPieces.filter(p => p.status === "publicado").length;
  const planejados = monthPieces.filter(p => p.status !== "publicado").length;
  const seriesAtivas = [...new Set(monthPieces.filter(p => p.series_name).map(p => p.series_name))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-xl font-bold flex-1">📅 Calendário editorial</h1>
        <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
          🗓 Planejar série em lote
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{totalMes}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{publicados}</div>
          <div className="text-xs text-muted-foreground">publicados</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{planejados}</div>
          <div className="text-xs text-muted-foreground">planejados</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{seriesAtivas.length}</div>
          <div className="text-xs text-muted-foreground">séries ativas</div>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterSeries} onValueChange={setFilterSeries}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as séries</SelectItem>
            <SelectItem value="__avulso">Avulsos</SelectItem>
            {seriesList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="publicados">Publicados</SelectItem>
            <SelectItem value="planejados">Planejados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm"
            onClick={() => setRefMonth(new Date(refMonth.getFullYear(), refMonth.getMonth() - 1, 1))}>
            ← Anterior
          </Button>
          <span className="text-sm font-semibold capitalize">{monthLabel}</span>
          <Button variant="ghost" size="sm"
            onClick={() => setRefMonth(new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1))}>
            Próximo →
          </Button>
        </div>

        <div className="flex gap-3 text-[10px] flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />Publicado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />Produção/Pronto</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />Roteiro</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border inline-block" />Planejado</span>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-[10px] text-muted-foreground text-center mb-1">
          {DOWS.map(d => <div key={d} className="py-0.5 font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[72px]" />;
            const iso = ymd(d);
            const dayItems = byDay[iso] ?? [];
            const isTodayCell = iso === ymd(new Date());
            return (
              <div key={i} className={cn(
                "min-h-[72px] rounded border p-1 space-y-0.5",
                isTodayCell ? "border-accent bg-accent/10" : "border-border/50"
              )}>
                <div className={cn("text-[10px] font-medium", isTodayCell && "text-accent")}>
                  {d.getDate()}
                </div>
                {dayItems.map(it => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onOpenPiece(it.id)}
                    title={`${it.title} — ${it.status}`}
                    className={cn(
                      "w-full text-left text-[9px] rounded border px-0.5 py-0.5 truncate flex items-center gap-0.5",
                      pieceBg(it)
                    )}
                  >
                    <span>{phaseLabel(it)}</span>
                    <span className="truncate">{it.title ?? "Sem título"}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {batchOpen && (
        <BatchSeriesPlanner
          seriesList={seriesList}
          onClose={() => setBatchOpen(false)}
          onSaved={() => { onRefresh(); setBatchOpen(false); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BATCH SERIES PLANNER                                               */
/* ------------------------------------------------------------------ */

function BatchSeriesPlanner({
  seriesList,
  onClose,
  onSaved,
}: {
  seriesList: { id: string; name: string; total_episodes_planned: number | null }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [seriesName, setSeriesName] = useState("");
  const [startEp, setStartEp] = useState("1");
  const [totalEps, setTotalEps] = useState("4");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [horario, setHorario] = useState("18:00");
  const [energia, setEnergia] = useState("topo");
  const [temas, setTemas] = useState<string[]>(Array(4).fill(""));
  const [saving, setSaving] = useState(false);

  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const toggleDay = (d: number) => {
    setWeekdays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  };

  const calcDates = () => {
    const dates: string[] = [];
    const n = Number(totalEps);
    if (!weekdays.length || !n) return dates;
    const d = new Date(startDate + "T12:00:00");
    let safety = 0;
    while (dates.length < n && safety < n * 30) {
      if (weekdays.includes(d.getDay())) {
        dates.push(d.toISOString().slice(0, 10));
      }
      d.setDate(d.getDate() + 1);
      safety++;
    }
    return dates;
  };

  const preview = calcDates();

  const handleTotalChange = (v: string) => {
    setTotalEps(v);
    const n = Number(v) || 0;
    setTemas(prev => {
      const next = [...prev];
      while (next.length < n) next.push("");
      return next.slice(0, n);
    });
  };

  const save = async () => {
    if (!seriesName || preview.length === 0) return;
    setSaving(true);
    try {
      const startEpNum = Number(startEp) || 1;
      const inserts = preview.map((date, i) => ({
        title: temas[i]?.trim() || `${seriesName} — Ep ${startEpNum + i}`,
        theme: temas[i]?.trim() || null,
        phase: 1,
        status: "ideia",
        scope: "profissional",
        energia,
        series_name: seriesName,
        series_position: startEpNum + i,
        planned_date: date,
      }));
      const { error } = await supabase.from("content_pieces").insert(inserts as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["studio-pieces"] });
      qc.invalidateQueries({ queryKey: ["studio-series-pieces"] });
      toast.success(`${inserts.length} episódios criados no calendário`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar episódios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🗓 Planejar série em lote</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Crie múltiplos episódios de uma série com datas distribuídas automaticamente.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Série *</Label>
            <Select value={seriesName} onValueChange={setSeriesName}>
              <SelectTrigger><SelectValue placeholder="Selecione uma série" /></SelectTrigger>
              <SelectContent>
                {seriesList.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Episódio inicial</Label>
              <Input type="number" min={1} value={startEp} onChange={e => setStartEp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade de episódios</Label>
              <Input type="number" min={1} max={52} value={totalEps} onChange={e => handleTotalChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Energia padrão</Label>
              <Select value={energia} onValueChange={setEnergia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topo">Topo</SelectItem>
                  <SelectItem value="meio">Meio</SelectItem>
                  <SelectItem value="fundo">Fundo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data do primeiro episódio</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário de publicação</Label>
              <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Dias da semana para publicar</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                    weekdays.includes(d)
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background border-border hover:bg-accent/10"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {temas.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Temas dos episódios (opcional — deixe em branco para gerar automaticamente)</Label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {temas.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      Ep {Number(startEp) + i}
                      {preview[i] ? ` · ${new Date(preview[i] + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : ""}
                    </span>
                    <Input
                      value={t}
                      onChange={e => setTemas(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                      placeholder="Tema deste episódio"
                      className="text-xs h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded border p-3 bg-muted/30 text-xs space-y-1">
              <div className="font-medium">Preview de distribuição:</div>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((d, i) => (
                  <span key={i} className="bg-background border rounded px-1.5 py-0.5">
                    Ep {Number(startEp) + i} · {new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={!seriesName || preview.length === 0 || saving}
              onClick={save}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Criar {preview.length} episódios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
