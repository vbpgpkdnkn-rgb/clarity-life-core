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
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Film,
  Loader2,
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
  objetivo?: string;
  meta_resultado?: string;
  ia_validacao_fase2?: {
    aprovado_para_roteiro?: boolean;
    status?: "alinhado" | "conflito";
    comentario?: string;
    sugestao?: string | null;
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
  updated_at: string;
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
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sem sessão");
      const title = `Nova peça ${new Date().toLocaleString("pt-BR")}`;
      const { data, error } = await supabase
        .from("content_pieces")
        .insert({ user_id: uid, title, phase: 1, status: "ideia", scope: "profissional" } as never)
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

  const columns = useMemo(() => {
    const items = piecesQ.data ?? [];
    return PHASES.map((p) => ({ ...p, items: items.filter((it) => (it.phase ?? 1) === p.n) }));
  }, [piecesQ.data]);

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

            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map((col) => (
                <div key={col.n} className="min-w-[260px] w-[260px] flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-sm font-medium">
                      <span className="text-muted-foreground mr-1.5">{col.n}.</span>
                      {col.label}
                    </h2>
                    <Badge variant="outline" className="text-[10px]">
                      {col.items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {col.items.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic px-2 py-6 text-center border border-dashed rounded-md">
                        vazio
                      </div>
                    ) : (
                      col.items.map((it) => (
                        <Card
                          key={it.id}
                          onClick={() => {
                            setActiveId(it.id);
                            setView("foco");
                          }}
                          className="p-3 cursor-pointer hover:border-accent transition-colors space-y-2"
                        >
                          <div className="text-sm font-medium line-clamp-2">{it.title ?? "Sem título"}</div>
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
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <FocoView
            pieceId={activeId}
            onBack={() => {
              setView("biblioteca");
              setActiveId(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* FOCO VIEW                                                          */
/* ------------------------------------------------------------------ */

function FocoView({ pieceId, onBack }: { pieceId: string | null; onBack: () => void }) {
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

      {currentPhase >= 3 && (
        <Card className="p-6 text-sm text-muted-foreground">
          Fase {currentPhase} — em construção.
        </Card>
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
          <Label>Qual é o tema?</Label>
          <Textarea
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
          <Label>De onde veio?</Label>
          <Input
            defaultValue={pd.origem ?? ""}
            onChange={(e) => patchPD({ origem: e.target.value })}
            placeholder="Consultório, nome do criador, link..."
          />
        </div>

        <div className="space-y-2">
          <Label>Descreva o que você viu, pensou ou percebeu</Label>
          <Textarea
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
            <Label>Comentários da audiência</Label>
            <Textarea
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
