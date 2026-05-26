import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, Wand2, ChevronDown, Trash2, Sparkles, Filter, History, MessageSquare, ArrowRight } from "lucide-react";
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
import { IdeaRefinementChatDrawer } from "@/components/conteudo/IdeaRefinementChatDrawer";
import type { RefinedIdea } from "@/hooks/useIdeaRefinementChat";
import { formatDateBR } from "@/lib/format";
import { useDistribuicaoSemana } from "@/hooks/useDistribuicaoSemana";
import { EnergiaBadge } from "@/components/conteudo/EnergiaUI";


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

interface ChatTarget {
  analysisId: string;
  ideaIndex: number;
  idea: AudienceIdea;
  analysis: AudienceAnalysisRow;
}

export function AudienceIntelligenceTab({ onDevelop }: Props) {
  const [transcript, setTranscript] = useState("");
  const [comments, setComments] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [author, setAuthor] = useState("");
  const [angle, setAngle] = useState<AudienceAngle>("aprofundar");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

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
    toast.success(`${ideasWithStatus.length} ideias geradas — todas ficam visíveis abaixo`);
  }

  const currentAnalysis = useMemo(
    () => analyses.find((a) => a.id === currentAnalysisId) ?? null,
    [analyses, currentAnalysisId],
  );

  function openChat(analysis: AudienceAnalysisRow, ideaIndex: number) {
    setChatTarget({ analysisId: analysis.id, ideaIndex, idea: analysis.ideas[ideaIndex], analysis });
  }

  function handleSendToMotor(analysis: AudienceAnalysisRow, ideaIndex: number, refinedOverride?: RefinedIdea) {
    const idea = analysis.ideas[ideaIndex];
    const seed: RelationalSeed = {
      theme: refinedOverride?.title || idea.title,
      hook: refinedOverride?.hook || idea.hook,
      anchor: idea.clinical_anchor,
      format: idea.format,
      energia: idea.energia,
      audienceContext: filterCommentsForIdea(analysis.comments, idea, refinedOverride),
      myPerspective: refinedOverride?.raw_synthesis
        ? `${analysis.my_perspective}\n\n— Síntese do refinamento —\n${refinedOverride.raw_synthesis}`
        : analysis.my_perspective,
      sourceLabel: refinedOverride?.title || idea.title,
      sourceOrigin: refinedOverride ? "Chat de refinamento" : "Inteligência de Audiência",
    };
    onDevelop(seed);
    setChatTarget(null);
  }


  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <Brain className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <h3 className="font-display font-semibold">Inteligência de Audiência</h3>
            <p className="text-xs text-muted-foreground">
              A IA cruza o que a referência disse, o que a audiência sentiu e o que VOCÊ pensa. Cada ideia vira um <strong>tema distinto</strong> identificado nos comentários — não variações do mesmo conteúdo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Transcrição do vídeo de referência</Label>
            <Textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)}
              placeholder="Cole a transcrição do vídeo que te inspirou..." className="mt-2" />
          </div>
          <div>
            <Label>Comentários da audiência</Label>
            <Textarea rows={8} value={comments} onChange={(e) => setComments(e.target.value)}
              placeholder="Cole comentários, dúvidas, reclamações e pedidos da audiência..." className="mt-2" />
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            O que eu penso sobre esse tema
            <Badge variant="outline" className="text-[10px]">essencial</Badge>
          </Label>
          <Textarea rows={5} value={myPerspective} onChange={(e) => setMyPerspective(e.target.value)}
            placeholder="Escreva livremente: concorda, discorda, tem um ângulo diferente, uma observação clínica..."
            className="mt-2" />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Quanto mais honesta aqui, melhor o resultado.
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
                {ANGLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button size="lg" onClick={handleAnalyze}
          disabled={ai.isPending || transcript.trim().length < 20 || comments.trim().length < 20}>
          <Wand2 className="h-4 w-4 mr-2" />
          {ai.isPending ? "Analisando audiência…" : "Analisar e gerar ideias"}
        </Button>
      </Card>

      {currentAnalysis && (
        <SessionResults
          analysis={currentAnalysis}
          onDevelop={(seed) => onDevelop(seed)}
          onChat={(ideaIndex) => openChat(currentAnalysis, ideaIndex)}
          onDirectSend={(ideaIndex) => handleSendToMotor(currentAnalysis, ideaIndex)}
          highlight
          myPerspective={myPerspective}
        />
      )}

      <SavedAnalysesPanel
        analyses={analyses.filter((a) => a.id !== currentAnalysisId)}
        onChat={openChat}
        onDirectSend={handleSendToMotor}
      />

      {chatTarget && (
        <IdeaRefinementChatDrawer
          open={!!chatTarget}
          onClose={() => setChatTarget(null)}
          analysisId={chatTarget.analysisId}
          ideaIndex={chatTarget.ideaIndex}
          ideaTitle={chatTarget.idea.title}
          context={{
            title: chatTarget.idea.title,
            angle_adopted: chatTarget.idea.angle_adopted,
            hook: chatTarget.idea.hook,
            audience_evidence: chatTarget.idea.audience_evidence,
            my_perspective: chatTarget.analysis.my_perspective,
            comments: filterCommentsForIdea(chatTarget.analysis.comments, chatTarget.idea),
          }}
          onSendToMotor={(refined) => handleSendToMotor(chatTarget.analysis, chatTarget.ideaIndex, refined)}
        />
      )}
    </div>
  );
}

function filterCommentsForIdea(allComments: string, idea: AudienceIdea, refined?: RefinedIdea): string {
  // Filtragem leve: pega linhas que contenham termos-chave do título da ideia ou da evidência
  const keywords = [...new Set([...idea.title.split(/\s+/), ...idea.audience_evidence.split(/\s+/)])]
    .filter((w) => w.length > 4).slice(0, 6).map((w) => w.toLowerCase());
  if (!keywords.length) return allComments.slice(0, 1500);
  const lines = allComments.split(/\n+/);
  const matched = lines.filter((l) => keywords.some((k) => l.toLowerCase().includes(k)));
  const out = matched.length > 2 ? matched.slice(0, 12).join("\n") : allComments.slice(0, 1500);
  return refined ? `${out}\n\n— Síntese refinada —\n${refined.raw_synthesis}` : out;
}

function SessionResults({
  analysis,
  onDevelop,
  onChat,
  onDirectSend,
  highlight,
  myPerspective,
}: {
  analysis: AudienceAnalysisRow;
  onDevelop: (seed: RelationalSeed) => void;
  onChat: (ideaIndex: number) => void;
  onDirectSend: (ideaIndex: number) => void;
  highlight?: boolean;
  myPerspective?: string;
}) {
  // CRÍTICO: usar Set para múltiplas expansões — clicar em UM card NUNCA esconde os outros.
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpandedSet((s) => {
    const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n;
  });
  const updateStatus = useUpdateAudienceIdeaStatus();

  return (
    <Card className={`p-4 space-y-3 ${highlight ? "border-accent/40" : ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            {analysis.ideas.length} temas identificados
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDateBR(analysis.created_at)} · ângulo: {analysis.angle} · clique num card para ver mais (sem esconder os outros)
          </p>
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
          const open = expandedSet.has(i);
          return (
            <Card key={i}
              className={`p-4 space-y-2 transition-colors ${open ? "border-accent/60 bg-accent/5" : "hover:border-accent/30"}`}
            >
              <div className="cursor-pointer" onClick={() => toggle(i)}>
                <div className="flex gap-1.5 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-[10px]">{idea.format}</Badge>
                  <Badge variant="outline" className="text-[10px]">{idea.clinical_anchor}</Badge>
                  {idea.dev_status === "em_desenvolvimento" && <Badge className="text-[10px]">em dev.</Badge>}
                  {idea.dev_status === "desenvolvida" && <Badge className="text-[10px] bg-accent">pronta</Badge>}
                </div>
                <h4 className="font-medium leading-snug text-sm">{idea.title}</h4>
                <p className="text-[11px] text-muted-foreground italic mt-1">↳ {idea.angle_adopted}</p>
                <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">"{idea.audience_evidence}"</p>
              </div>

              {open && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-accent">Gancho sugerido</p>
                    <p className="text-sm leading-relaxed">{idea.hook}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Por que esse ângulo</p>
                    <p className="text-xs">{idea.why_angle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Formato</p>
                    <p className="text-xs">{idea.format_rationale}</p>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); onChat(i); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Abrir no chat para refinar
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus.mutate({ analysis_id: analysis.id, idea_index: i, dev_status: "em_desenvolvimento" });
                        onDirectSend(i);
                      }}
                    >
                      Enviar para o Motor Relacional <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
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
  onChat,
  onDirectSend,
}: {
  analyses: AudienceAnalysisRow[];
  onChat: (analysis: AudienceAnalysisRow, ideaIndex: number) => void;
  onDirectSend: (analysis: AudienceAnalysisRow, ideaIndex: number) => void;
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
                    <SessionResults
                      analysis={{ ...a, ideas: filtered }}
                      onDevelop={() => {}}
                      onChat={(ideaIndex) => onChat(a, originalIndex(a, filtered[ideaIndex]))}
                      onDirectSend={(ideaIndex) => onDirectSend(a, originalIndex(a, filtered[ideaIndex]))}
                    />
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

function originalIndex(analysis: AudienceAnalysisRow, idea: AudienceIdea): number {
  return analysis.ideas.findIndex((i) => i.title === idea.title && i.hook === idea.hook);
}
