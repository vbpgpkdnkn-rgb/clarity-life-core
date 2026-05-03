import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, Wand2, ChevronDown, Trash2, Sparkles, Library, Filter, History } from "lucide-react";
import { toast } from "sonner";
import {
  useAudienceIntelligence,
  useAudienceAnalyses,
  useSaveAudienceAnalysis,
  useUpdateAudienceIdeaStatus,
  useDeleteAudienceAnalysis,
  type AudienceIdea,
  type AudienceAngle,
  type AudienceAnalysisRow,
} from "@/hooks/useAudienceIntelligence";
import { RelationalSeed } from "@/components/conteudo/RelationalEngineTab";
import { formatDateBR } from "@/lib/format";

const ANGLE_OPTIONS: { value: AudienceAngle; label: string }[] = [
  { value: "aprofundar", label: "Aprofundar com minha visão clínica" },
  { value: "discordar", label: "Discordar e apresentar minha perspectiva" },
  { value: "diferente", label: "Usar o tema com ângulo completamente diferente" },
  { value: "audiencia", label: "Partir dos comentários como problema central" },
  { value: "livre", label: "Deixar a IA identificar o melhor ângulo" },
];

const DEV_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "nao_desenvolvida", label: "Não desenvolvidas" },
  { key: "em_desenvolvimento", label: "Em desenvolvimento" },
  { key: "desenvolvida", label: "Desenvolvidas" },
] as const;

type DevFilter = typeof DEV_FILTERS[number]["key"];

interface Props {
  onDevelop: (seed: RelationalSeed) => void;
}

export function AudienceIntelligenceTab({ onDevelop }: Props) {
  const [transcript, setTranscript] = useState("");
  const [comments, setComments] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [author, setAuthor] = useState("");
  const [angle, setAngle] = useState<AudienceAngle>("aprofundar");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  const ai = useAudienceIntelligence();
  const save = useSaveAudienceAnalysis();
  const { data: analyses = [] } = useAudienceAnalyses();

  async function handleAnalyze() {
    const data = await ai.mutateAsync({
      transcript: transcript.trim(),
      comments: comments.trim(),
      my_perspective: myPerspective.trim(),
      author: author.trim() || undefined,
      angle,
    });
    const ideasWithStatus: AudienceIdea[] = data.ideas.map((i) => ({ ...i, dev_status: "nao_desenvolvida" }));
    const saved = await save.mutateAsync({
      title: ideasWithStatus[0]?.title?.slice(0, 80) ?? "Análise de audiência",
      author: author.trim() || null,
      angle,
      transcript: transcript.trim(),
      comments: comments.trim(),
      my_perspective: myPerspective.trim(),
      patterns: data.patterns ?? [],
      ideas: ideasWithStatus,
    });
    setCurrentAnalysisId(saved.id);
    toast.success(`${ideasWithStatus.length} ideias geradas e salvas`);
  }

  const currentAnalysis = useMemo(
    () => analyses.find((a) => a.id === currentAnalysisId) ?? null,
    [analyses, currentAnalysisId],
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <Brain className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <h3 className="font-display font-semibold">Inteligência de Audiência</h3>
            <p className="text-xs text-muted-foreground">
              A IA cruza o que a referência disse, o que a audiência sentiu e o que VOCÊ pensa sobre o tema. Sua perspectiva é o que diferencia o conteúdo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Transcrição do vídeo de referência</Label>
            <Textarea
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Cole a transcrição do vídeo que te inspirou..."
              className="mt-2"
            />
          </div>
          <div>
            <Label>Comentários da audiência</Label>
            <Textarea
              rows={8}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Cole comentários, dúvidas, reclamações e pedidos da audiência desse vídeo..."
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            O que eu penso sobre esse tema
            <Badge variant="outline" className="text-[10px]">essencial</Badge>
          </Label>
          <Textarea
            rows={5}
            value={myPerspective}
            onChange={(e) => setMyPerspective(e.target.value)}
            placeholder="Escreva livremente: concorda, discorda, tem um ângulo diferente, uma experiência clínica, uma observação que ninguém falou ainda..."
            className="mt-2"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Isso é o que diferencia o seu conteúdo. Quanto mais honesta aqui, melhor o resultado.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1.6fr]">
          <div>
            <Label>Autor / perfil de referência</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="opcional" className="mt-2" />
          </div>
          <div>
            <Label>O que você quer fazer com isso?</Label>
            <Select value={angle} onValueChange={(v) => setAngle(v as AudienceAngle)}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANGLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleAnalyze}
          disabled={ai.isPending || transcript.trim().length < 20 || comments.trim().length < 20}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {ai.isPending ? "Analisando audiência…" : "Analisar e gerar ideias"}
        </Button>
      </Card>

      {currentAnalysis && (
        <SessionResults analysis={currentAnalysis} onDevelop={onDevelop} highlight />
      )}

      <SavedAnalysesPanel
        analyses={analyses.filter((a) => a.id !== currentAnalysisId)}
        onDevelop={onDevelop}
      />
    </div>
  );
}

function SessionResults({
  analysis,
  onDevelop,
  highlight,
}: {
  analysis: AudienceAnalysisRow;
  onDevelop: (seed: RelationalSeed) => void;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const updateStatus = useUpdateAudienceIdeaStatus();

  return (
    <Card className={`p-4 space-y-3 ${highlight ? "border-accent/40" : ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            {analysis.ideas.length} ideias geradas
          </h3>
          <p className="text-xs text-muted-foreground">{formatDateBR(analysis.created_at)} · ângulo: {analysis.angle}</p>
        </div>
      </div>

      {analysis.patterns.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded p-3">
          <p className="text-[10px] uppercase tracking-widest text-accent mb-2">Padrões detectados nos comentários</p>
          <div className="flex flex-wrap gap-2">
            {analysis.patterns.map((p, i) => <Badge key={i} variant="outline">{p}</Badge>)}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {analysis.ideas.map((idea, i) => {
          const open = expanded === i;
          return (
            <Card
              key={i}
              className={`p-4 space-y-2 cursor-pointer transition-colors ${open ? "border-accent/60 bg-accent/5" : "hover:border-accent/30"}`}
              onClick={() => setExpanded(open ? null : i)}
            >
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{idea.format}</Badge>
                <Badge variant="outline" className="text-[10px]">{idea.clinical_anchor}</Badge>
                {idea.dev_status === "em_desenvolvimento" && <Badge className="text-[10px]">em dev.</Badge>}
                {idea.dev_status === "desenvolvida" && <Badge className="text-[10px] bg-accent">pronta</Badge>}
              </div>
              <h4 className="font-medium leading-snug text-sm">{idea.title}</h4>
              <p className="text-[11px] text-muted-foreground italic">↳ {idea.angle_adopted}</p>
              <p className="text-sm leading-relaxed">{idea.hook}</p>

              {open && (
                <div className="space-y-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Por que esse ângulo</p>
                    <p className="text-xs">{idea.why_angle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Base na audiência</p>
                    <p className="text-xs">{idea.audience_evidence}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Formato</p>
                    <p className="text-xs">{idea.format_rationale}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      updateStatus.mutate({ analysis_id: analysis.id, idea_index: i, dev_status: "em_desenvolvimento" });
                      onDevelop({
                        theme: idea.title,
                        hook: idea.hook,
                        anchor: idea.clinical_anchor,
                        format: idea.format,
                        audienceContext: `Comentários:\n${analysis.comments.slice(0, 1500)}\n\nPadrões: ${analysis.patterns.join(" · ")}\n\nBase: ${idea.audience_evidence}`,
                        myPerspective: analysis.my_perspective,
                        sourceLabel: idea.title,
                        sourceOrigin: "Inteligência de Audiência",
                      });
                    }}
                  >
                    Desenvolver este conteúdo →
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

function SavedAnalysesPanel({
  analyses,
  onDevelop,
}: {
  analyses: AudienceAnalysisRow[];
  onDevelop: (seed: RelationalSeed) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DevFilter>("todas");
  const del = useDeleteAudienceAnalysis();

  if (analyses.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <History className="h-4 w-4" /> Análises anteriores
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as DevFilter)}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEV_FILTERS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {analyses.map((a) => {
          const filtered = filter === "todas"
            ? a.ideas
            : a.ideas.filter((i) => (i.dev_status ?? "nao_desenvolvida") === filter);
          const open = openId === a.id;
          return (
            <Collapsible key={a.id} open={open} onOpenChange={(o) => setOpenId(o ? a.id : null)}>
              <Card className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <CollapsibleTrigger className="flex-1 text-left flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                    <div>
                      <p className="text-sm font-medium">{a.title || "Análise sem título"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateBR(a.created_at)} · {a.ideas.length} ideias · ângulo: {a.angle}
                      </p>
                    </div>
                  </CollapsibleTrigger>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CollapsibleContent className="mt-3">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma ideia neste filtro.</p>
                  ) : (
                    <SessionResults analysis={{ ...a, ideas: filtered }} onDevelop={onDevelop} />
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}
