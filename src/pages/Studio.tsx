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
  Pencil,
  Play,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PhaseData = {
  tipo_entrada?: string;
  origem?: string;
  conteudo?: string;
  conteudo_audiencia?: string;
  ia_leitura_fase1?: {
    energia_sugerida?: string;
    observacao?: string;
    padroes_audiencia?: string | null;
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
  blocos_ajustados?: ScriptBlock[];
  papeis_modificados?: string[];
  instrucao_ajuste_livre?: string;
  ajustes_marcados?: string[];
  revisao_ia?: ReviewIA;
  [k: string]: unknown;
};

type ScriptStructure = unknown;
type Insight = {
  id?: string;
  titulo_angulo?: string;
  tensao?: string;
  frase_semente?: string;
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

export default function Studio() {
  const qc = useQueryClient();
  const [view, setView] = useState<"biblioteca" | "foco">("biblioteca");
  const [activeId, setActiveId] = useState<string | null>(null);

  const piecesQ = useQuery({
    queryKey: ["studio-pieces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select(
          "id,title,theme,phase,status,scope,energia,creation_strategy,planned_date,series_name,series_position,phase_data,updated_at",
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
      setActiveId(id);
      setView("foco");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const [filter, setFilter] = useState<"todos" | "tema" | "estrategia" | "roteiro" | "producao" | "publicados">("todos");

  const filtered = useMemo(() => {
    const items = piecesQ.data ?? [];
    switch (filter) {
      case "tema": return items.filter((it) => (it.phase ?? 1) === 1);
      case "estrategia": return items.filter((it) => (it.phase ?? 1) === 2);
      case "roteiro": return items.filter((it) => (it.phase ?? 1) === 3);
      case "producao": return items.filter((it) => (it.phase ?? 1) === 4);
      case "publicados": return items.filter((it) => it.status === "publicado");
      default: return items;
    }
  }, [piecesQ.data, filter]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {view === "biblioteca" ? (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
                  <Clapperboard className="h-7 w-7 text-accent" />
                  Studio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">seu estúdio de conteúdo</p>
              </div>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                <Plus className="h-4 w-4" />
                Nova peça
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "todos", label: "Todos" },
                { key: "tema", label: "Tema" },
                { key: "estrategia", label: "Estratégia" },
                { key: "roteiro", label: "Roteiro" },
                { key: "producao", label: "Produção" },
                { key: "publicados", label: "Publicados" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={filter === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(tab.key as typeof filter)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-muted-foreground">Nenhuma peça aqui ainda</p>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                  <Plus className="h-4 w-4" />
                  Criar primeira peça
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((it) => (
                  <Card
                    key={it.id}
                    onClick={() => {
                      setActiveId(it.id);
                      setView("foco");
                    }}
                    className={cn(
                      "p-4 cursor-pointer hover:border-accent transition-colors space-y-2 relative",
                      it.status === "publicado" && "opacity-60"
                    )}
                  >
                    {it.status === "publicado" && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                    <div className="text-sm font-semibold line-clamp-2">{it.title ?? "Sem título"}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {energiaBadge(it.energia)}
                      {it.creation_strategy && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {it.creation_strategy}
                        </Badge>
                      )}
                      {it.planned_date && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(it.planned_date)}
                        </span>
                      )}
                    </div>
                    {it.series_name && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Film className="h-3 w-3" />
                        <span className="truncate">
                          {it.series_name}
                          {it.series_position ? ` · ep ${it.series_position}` : ""}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <FocoView
            pieceId={activeId}
            onBack={() => {
              setView("biblioteca");
              setActiveId(null);
            }}
            onOpenPiece={(id) => setActiveId(id)}
          />
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* FOCO VIEW                                                          */
/* ------------------------------------------------------------------ */

function FocoView({ pieceId, onBack, onOpenPiece }: { pieceId: string | null; onBack: () => void; onOpenPiece: (id: string) => void }) {
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
    if (piece) setCurrentPhase(piece.phase ?? 1);
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
          onAdvance={async () => {
            await flush();
            await supabase
              .from("content_pieces")
              .update({ phase: 5, pipeline_stage: "pronto_postar" } as never)
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
  const [audienceOpen, setAudienceOpen] = useState(!!pd.conteudo_audiencia);
  const temaRef = useRef<HTMLTextAreaElement>(null);
  const conteudoRef = useRef<HTMLTextAreaElement>(null);
  const audienciaRef = useRef<HTMLTextAreaElement>(null);

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

  const leitura = pd.ia_leitura_fase1;

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
            <div className="space-y-2">
              <Label>Nome da série</Label>
              <Input
                defaultValue={piece.series_name ?? ""}
                onChange={(e) => queue({ series_name: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Episódio nº</Label>
              <Input
                type="number"
                defaultValue={piece.series_position ?? ""}
                onChange={(e) =>
                  queue({ series_position: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
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

      {leitura && (
        <Card className="p-5 space-y-3 border-accent/40">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Energia sugerida:</span>
            {energiaBadge(leitura.energia_sugerida)}
          </div>
          {leitura.observacao && <p className="text-sm">{leitura.observacao}</p>}
          {leitura.padroes_audiencia && (
            <div className="text-sm border-t pt-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Padrões da audiência</div>
              {leitura.padroes_audiencia}
            </div>
          )}
        </Card>
      )}
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
  const patchPD = (p: Partial<PhaseData>) => queue({ phase_data: { ...pd, ...p } });

  const validar = async () => {
    setLoading(true);
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
            meta_resultado: pd.meta_resultado,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.result ?? {};
      queue({ phase_data: { ...pd, ia_validacao_fase2: result } });
      await flush();
      toast.success("Validação pronta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setLoading(false);
    }
  };

  const validacao = pd.ia_validacao_fase2;
  const aprovado = validacao?.aprovado_para_roteiro === true;

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
        <Label>Qual é o objetivo deste conteúdo?</Label>
        <Textarea
          defaultValue={pd.objetivo ?? ""}
          onChange={(e) => patchPD({ objetivo: e.target.value })}
          placeholder="O que você quer que a pessoa sinta, perceba ou faça ao terminar?"
          rows={3}
        />
      </Card>

      <Card className="p-6 space-y-3">
        <Label>Meta de resultado</Label>
        <div className="space-y-2">
          {METAS_RESULTADO.map((m) => {
            const active = pd.meta_resultado === m;
            return (
              <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="meta_resultado"
                  checked={active}
                  onChange={() => patchPD({ meta_resultado: m })}
                  className="accent-accent"
                />
                {m}
              </label>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={validar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Validar estratégia
        </Button>
        <Button onClick={onAdvance} disabled={!aprovado}>
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

function Phase3({
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
  const qc = useQueryClient();
  const [sub, setSub] = useState<"insights" | "esboco" | "ajustes" | "revisao">("insights");
  const [loading, setLoading] = useState<string | null>(null);
  const [teleOpen, setTeleOpen] = useState(false);

  const patchPD = (p: Partial<PhaseData>) => queue({ phase_data: { ...pd, ...p } });

  const templatesQ = useQuery({
    queryKey: ["script-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_templates")
        .select("id,name,description,structure")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

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

  /* ---------- 3a INSIGHTS ---------- */
  const gerarInsights = async () => {
    const result = await callAI("phase3_insights", {
      tema: piece.theme,
      energia: piece.energia,
      creation_strategy: piece.creation_strategy,
      objetivo: pd.objetivo,
      conteudo_audiencia: pd.conteudo_audiencia,
      ai_memory: piece.ai_memory,
      script_template: pd.template_selecionado ?? null,
    });
    if (!result) return;
    const insights: Insight[] = (result as { insights?: Insight[] }).insights ?? [];
    patchPD({ insights_gerados: insights });
    await flush();
  };

  const insights = pd.insights_gerados ?? [];
  const aprovados = pd.insights_aprovados ?? [];
  const isSelected = (id: string) => aprovados.some((i) => i.id === id);
  const toggleInsight = (ins: Insight) => {
    if (!ins.id) return;
    const next = isSelected(ins.id)
      ? aprovados.filter((i) => i.id !== ins.id)
      : [...aprovados, ins];
    patchPD({ insights_aprovados: next });
  };

  /* ---------- 3b ESBOÇO ---------- */
  const gerarEsboco = async () => {
    const result = await callAI("phase3_draft", {
      tema: piece.theme,
      energia: piece.energia,
      objetivo: pd.objetivo,
      insights_aprovados: aprovados,
      script_template: pd.template_selecionado ?? null,
    });
    if (!result) return;
    const blocos: ScriptBlock[] = (result as { blocos?: ScriptBlock[] }).blocos ?? [];
    patchPD({ blocos_rascunho: blocos, blocos_editados: blocos });
    await flush();
  };

  const blocosBase: ScriptBlock[] = pd.blocos_editados ?? pd.blocos_rascunho ?? [];
  const totalSeconds = blocosBase.reduce((acc, b) => acc + wordsAndSeconds(b.texto || "").seconds, 0);
  const tempoOk = totalSeconds >= 45 && totalSeconds <= 65;

  const editarBloco = (idx: number, texto: string) => {
    const next = (pd.blocos_editados ?? pd.blocos_rascunho ?? []).map((b, i) =>
      i === idx ? { ...b, texto } : b,
    );
    patchPD({ blocos_editados: next });
  };

  /* ---------- 3c AJUSTES ---------- */
  const ajustes = pd.ajustes_marcados ?? [];
  const toggleAjuste = (a: string) => {
    const next = ajustes.includes(a) ? ajustes.filter((x) => x !== a) : [...ajustes, a];
    patchPD({ ajustes_marcados: next });
  };

  const aplicarAjustes = async () => {
    const result = await callAI("phase3_adjust", {
      blocos_atuais: pd.blocos_editados ?? pd.blocos_rascunho ?? [],
      ajustes_marcados: ajustes,
      instrucao_livre: pd.instrucao_ajuste_livre ?? "",
    });
    if (!result) return;
    const r = result as { blocos_ajustados?: ScriptBlock[]; papeis_modificados?: string[] };
    patchPD({
      blocos_ajustados: r.blocos_ajustados ?? [],
      papeis_modificados: r.papeis_modificados ?? [],
    });
    await flush();
  };

  /* ---------- 3d REVISÃO ---------- */
  const blocosFinais: ScriptBlock[] =
    pd.blocos_ajustados ?? pd.blocos_editados ?? pd.blocos_rascunho ?? [];

  const editarBlocoFinal = (idx: number, texto: string) => {
    const base = pd.blocos_ajustados ?? pd.blocos_editados ?? pd.blocos_rascunho ?? [];
    const next = base.map((b, i) => (i === idx ? { ...b, texto } : b));
    if (pd.blocos_ajustados) patchPD({ blocos_ajustados: next });
    else patchPD({ blocos_editados: next });
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
    patchPD({ revisao_ia: result as ReviewIA });
    await flush();
  };

  const aprovarRoteiro = async () => {
    const corrido = blocosFinais.map((b) => b.texto).join("\n\n");
    await flush();
    await supabase
      .from("content_pieces")
      .update({ phase: 4, script: corrido } as never)
      .eq("id", piece.id);
    qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    await onAdvance();
  };

  const fontSize = piece.teleprompter_font_size ?? 32;
  const fontTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFont = (v: number) => {
    queue({ teleprompter_font_size: v });
    if (fontTimer.current) clearTimeout(fontTimer.current);
    fontTimer.current = setTimeout(flush, 500);
  };

  const subTabs: { v: typeof sub; label: string }[] = [
    { v: "insights", label: "Insights" },
    { v: "esboco", label: "Esboço" },
    { v: "ajustes", label: "Ajustes" },
    { v: "revisao", label: "Revisão final" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        {subTabs.map((t) => (
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

      {/* 3a INSIGHTS */}
      {sub === "insights" && (
        <div className="space-y-4">
          {(templatesQ.data ?? []).length > 0 && (
            <Card className="p-4 space-y-2">
              <Label>Usar um modelo de roteiro?</Label>
              <Select
                value={
                  pd.template_selecionado
                    ? JSON.stringify(pd.template_selecionado)
                    : "__none__"
                }
                onValueChange={(v) => {
                  if (v === "__none__") patchPD({ template_selecionado: null });
                  else patchPD({ template_selecionado: JSON.parse(v) });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {(templatesQ.data ?? []).map((t: { id: string; name: string; structure: unknown }) => (
                    <SelectItem key={t.id} value={JSON.stringify(t.structure)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button onClick={gerarInsights} disabled={loading === "phase3_insights"}>
              {loading === "phase3_insights" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {insights.length > 0 ? "Regerar insights" : "Gerar insights"}
            </Button>
            <Button
              variant="outline"
              disabled={aprovados.length === 0}
              onClick={() => setSub("esboco")}
            >
              Gerar esboço com estes insights
            </Button>
          </div>

          {loading === "phase3_insights" && (
            <div className="grid md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-1/3" />
                </Card>
              ))}
            </div>
          )}

          {loading !== "phase3_insights" && insights.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {insights.map((ins, idx) => {
                const id = ins.id ?? String(idx);
                const sel = isSelected(id);
                return (
                  <Card
                    key={id}
                    className={cn(
                      "p-4 space-y-3 cursor-pointer transition-colors",
                      sel ? "border-accent bg-accent/5" : "hover:border-accent/40",
                    )}
                    onClick={() => toggleInsight({ ...ins, id })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{ins.titulo_angulo}</div>
                      {energiaBadge(ins.energia_sugerida)}
                    </div>
                    {ins.tensao && (
                      <div className="text-xs">
                        <span className="text-muted-foreground uppercase mr-1">Tensão:</span>
                        {ins.tensao}
                      </div>
                    )}
                    {ins.frase_semente && (
                      <div className="text-sm italic">"{ins.frase_semente}"</div>
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer pt-2 border-t">
                      <Checkbox checked={sel} onCheckedChange={() => toggleInsight({ ...ins, id })} />
                      Selecionar este insight
                    </label>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3b ESBOÇO */}
      {sub === "esboco" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button onClick={gerarEsboco} disabled={loading === "phase3_draft"}>
              {loading === "phase3_draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {blocosBase.length > 0 ? "Regerar esboço" : "Gerar esboço"}
            </Button>
            <Button variant="outline" disabled={blocosBase.length === 0} onClick={() => setSub("ajustes")}>
              Ir para ajustes
            </Button>
          </div>

          {blocosBase.length > 0 && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Tempo total estimado</span>
                <span className={cn("font-semibold", tempoOk ? "text-emerald-600" : "text-red-500")}>
                  {totalSeconds}s {tempoOk ? "✓" : "(ideal 45–65s)"}
                </span>
              </div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", tempoOk ? "bg-emerald-500" : "bg-red-500")}
                  style={{ width: `${Math.min(100, (totalSeconds / 65) * 100)}%` }}
                />
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {blocosBase.map((b, idx) => {
              const { words, seconds } = wordsAndSeconds(b.texto || "");
              return (
                <Card key={idx} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {b.papel}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {words} palavras · ~{seconds}s
                    </div>
                  </div>
                  <Textarea
                    value={b.texto}
                    onChange={(e) => editarBloco(idx, e.target.value)}
                    rows={3}
                  />
                  {b.nota_gravacao && (
                    <p className="text-[11px] text-muted-foreground italic">↳ {b.nota_gravacao}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 3c AJUSTES */}
      {sub === "ajustes" && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <Label>O que ajustar?</Label>
            {AJUSTES_PRESET.map((a) => (
              <label key={a} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={ajustes.includes(a)}
                  onCheckedChange={() => toggleAjuste(a)}
                  className="mt-0.5"
                />
                {a}
              </label>
            ))}
          </Card>

          <Card className="p-4 space-y-2">
            <Label>O que mais quer ajustar?</Label>
            <Textarea
              defaultValue={pd.instrucao_ajuste_livre ?? ""}
              onChange={(e) => patchPD({ instrucao_ajuste_livre: e.target.value })}
              rows={3}
              placeholder="Instrução livre"
            />
          </Card>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={aplicarAjustes} disabled={loading === "phase3_adjust"}>
              {loading === "phase3_adjust" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Aplicar ajustes
            </Button>
            <Button variant="outline" onClick={() => setSub("revisao")}>
              Revisar roteiro final
            </Button>
          </div>

          {pd.papeis_modificados && pd.papeis_modificados.length > 0 && (
            <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="text-xs uppercase font-medium mb-1">Blocos modificados</div>
              <div className="flex flex-wrap gap-1.5">
                {pd.papeis_modificados.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px]">
                    {p}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 3d REVISÃO FINAL */}
      {sub === "revisao" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {blocosFinais.map((b, idx) => (
              <BlockReadEdit
                key={idx}
                block={b}
                onSave={(texto) => editarBlocoFinal(idx, texto)}
              />
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={analisarRoteiro} disabled={loading === "phase3_review"}>
              {loading === "phase3_review" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Análise da IA
            </Button>
            <Button variant="outline" onClick={() => setTeleOpen(true)}>
              <Play className="h-4 w-4" />
              Abrir Teleprompter
            </Button>
            <Button onClick={aprovarRoteiro}>Roteiro aprovado — ir para Produção</Button>
          </div>

          {pd.revisao_ia && <ReviewCard r={pd.revisao_ia} />}
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

function BlockReadEdit({ block, onSave }: { block: ScriptBlock; onSave: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(block.texto);
  useEffect(() => setLocal(block.texto), [block.texto]);
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] uppercase">
          {block.papel}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (editing) onSave(local);
            setEditing((v) => !v);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? "Salvar" : "Editar"}
        </Button>
      </div>
      {editing ? (
        <Textarea value={local} onChange={(e) => setLocal(e.target.value)} rows={3} />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{block.texto}</p>
      )}
      {block.nota_gravacao && (
        <p className="text-[11px] text-muted-foreground italic">↳ {block.nota_gravacao}</p>
      )}
    </Card>
  );
}

function ReviewCard({ r }: { r: ReviewIA }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-baseline gap-3">
        <div className="text-4xl font-bold tabular-nums">{r.score_retencao ?? 0}</div>
        <div className="text-sm text-muted-foreground">
          retenção · estimativa <span className="font-medium uppercase">{r.estimativa ?? "?"}</span>
        </div>
      </div>
      {r.pontos_fortes && r.pontos_fortes.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs uppercase text-emerald-600 font-medium">Pontos fortes</div>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {r.pontos_fortes.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {r.pontos_fracos && r.pontos_fracos.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs uppercase text-amber-600 font-medium">Pontos fracos</div>
          <ul className="text-sm space-y-2">
            {r.pontos_fracos.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.ponto}</span>
                <div className="text-xs text-muted-foreground">↳ {p.correcao}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.alerta_posicionamento && (
        <div className="text-sm border border-red-500/40 bg-red-500/5 rounded p-3">
          <span className="text-xs uppercase text-red-600 font-medium mr-2">Alerta de posicionamento</span>
          {r.alerta_posicionamento}
        </div>
      )}
      {r.comentario_final && <p className="text-sm border-t pt-3">{r.comentario_final}</p>}
    </Card>
  );
}

function Teleprompter({
  open,
  onOpenChange,
  text,
  fontSize,
  onFontChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  text: string;
  fontSize: number;
  onFontChange: (v: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 bg-black text-white border-0 rounded-none flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="absolute top-3 right-3 z-10">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute top-3 left-3 right-16 z-10 flex items-center gap-3">
          <span className="text-xs opacity-70 w-16">Fonte: {fontSize}px</span>
          <Slider
            min={20}
            max={48}
            step={1}
            value={[fontSize]}
            onValueChange={(v) => onFontChange(v[0])}
            className="max-w-xs"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-10 pt-20">
          <div
            className="max-w-4xl mx-auto leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: `${fontSize}px` }}
          >
            {text || "(roteiro vazio)"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/* PHASE 4 — PRODUÇÃO                                                 */
/* ================================================================== */

const DEFAULT_EDIT_CHECKLIST: { label: string; done: boolean }[] = [
  { label: "Corte inicial e final", done: false },
  { label: "Ajuste de áudio", done: false },
  { label: "Legendas adicionadas", done: false },
  { label: "Revisão de ritmo e cortes", done: false },
  { label: "Thumbnail definida", done: false },
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
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (p: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onAdvance: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const [sub, setSub] = useState<"editorial" | "gravacao" | "pos">("editorial");
  const [teleOpen, setTeleOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

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
  onReady: () => Promise<void>;
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
            roteiro_final_texto: piece.script,
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

      <Card className="p-5 space-y-2">
        <Label>Legenda do post</Label>
        <Textarea
          defaultValue={piece.caption ?? ""}
          onChange={(e) => queue({ caption: e.target.value })}
          rows={5}
          placeholder="Escreva a legenda ou use o botão abaixo para gerar com IA"
        />
      </Card>

      <Card className="p-5 space-y-3">
        <div>
          <div className="text-base font-semibold">Multiplicar conteúdo</div>
          <p className="text-xs text-muted-foreground">
            Transforme este Reel em 4 formatos diferentes
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

      <Button size="lg" onClick={onReady}>
        Pronto para postar
      </Button>
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

function Phase5({
  piece,
  pd,
  queue,
  flush,
  onOpenPiece,
}: {
  piece: Piece;
  pd: PhaseData;
  queue: (patch: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  onOpenPiece: (id: string) => void;
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

  useEffect(() => {
    if (metricsQ.data) setM({ ...metricsQ.data });
  }, [metricsQ.data?.id]);

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
      toast.success("Métricas salvas");
      qc.invalidateQueries({ queryKey: ["studio-metrics", piece.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSavingMetrics(false);
    }
  };

  const comentarios = (pd.comentarios_recebidos as string) ?? "";

  const [analyzing, setAnalyzing] = useState(false);
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await flush();
      const { data, error } = await supabase.functions.invoke("studio-agent", {
        body: {
          action: "phase5_performance",
          payload: {
            tema: piece.theme,
            energia: piece.energia,
            objetivo: pd.objetivo,
            roteiro_texto: piece.script,
            metricas: {
              views: m.views,
              likes: m.likes,
              comments: m.comments,
              shares: m.shares,
              saves: m.saves,
              reach: m.reach,
              dms: m.dms_recebidos,
              appointments: m.agendamentos,
            },
            comentarios,
            ai_memory: piece.ai_memory,
          },
        },
      });
      if (error) throw error;
      const result = (data as { result: PerformanceAnalysis }).result;
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
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .insert({
          title: (piece.title ?? "Nova peça") + " (novo ângulo)",
          theme: (piece.theme ?? "") + " (novo ângulo)",
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

  const markPublished = async () => {
    await supabase
      .from("content_pieces")
      .update({ published_at: today, status: "publicado" } as never)
      .eq("id", piece.id);
    qc.invalidateQueries({ queryKey: ["studio-piece", piece.id] });
    qc.invalidateQueries({ queryKey: ["studio-pieces"] });
    toast.success("Peça marcada como publicada");
  };

  const [showHistory, setShowHistory] = useState(false);
  const historyQ = useQuery({
    queryKey: ["studio-published-history"],
    enabled: showHistory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pieces")
        .select("id,title,published_at,energia,performance_analysis")
        .eq("status", "publicado")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pick<Piece, "id" | "title" | "published_at" | "energia" | "performance_analysis">[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-medium text-base">{piece.title ?? "Sem título"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {piece.published_at
                ? `publicado em ${new Date(piece.published_at).toLocaleDateString("pt-BR")}`
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
          </div>
        </div>
        {!piece.published_at && (
          <Button size="sm" variant="outline" onClick={markPublished}>
            Marcar como publicado
          </Button>
        )}
      </Card>

      {/* Métricas */}
      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Registrar métricas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ["views", "Views"],
            ["likes", "Curtidas"],
            ["comments", "Comentários"],
            ["shares", "Compartilhamentos"],
            ["saves", "Salvamentos"],
            ["reach", "Alcance"],
            ["dms_recebidos", "DMs recebidos"],
            ["agendamentos", "Agendamentos"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                value={m[key] ?? 0}
                onChange={(e) =>
                  setM((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                }
              />
            </div>
          ))}
        </div>
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
            {analysis.reuso_sugerido && (
              <Button
                variant="outline"
                onClick={() => createReuseMut.mutate()}
                disabled={createReuseMut.isPending}
              >
                <Plus className="h-4 w-4" />
                Criar novo conteúdo a partir deste
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Histórico */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Histórico de peças</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)}>
            {showHistory ? "Ocultar" : "Ver todas as peças publicadas"}
          </Button>
        </div>
        {showHistory && (
          <div className="space-y-2">
            {historyQ.isLoading && <Skeleton className="h-12 w-full" />}
            {(historyQ.data ?? []).length === 0 && !historyQ.isLoading && (
              <p className="text-sm text-muted-foreground italic">Nenhuma peça publicada ainda.</p>
            )}
            {(historyQ.data ?? []).map((it) => {
              const score =
                (it.performance_analysis as PerformanceAnalysis | null)?.o_que_funcionou?.length ?? null;
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
                        ? new Date(it.published_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {energiaBadge(it.energia)}
                    {score !== null && (
                      <Badge variant="outline" className="text-[10px]">
                        {score} ✓
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

