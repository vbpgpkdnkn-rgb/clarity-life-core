import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart, Wand2, Loader2, Copy, Save, Library, Mic2, FileText, XCircle,
  Sparkles, RefreshCw, Compass, Layers3, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGenerateRelational,
  useSaveRelationalAsIdea,
  useRelationalIdeas,
  type RelationalTopicsResult,
  type RelationalScriptResult,
  type RelationalVariationsResult,
  type RelationalSeriesResult,
  type ScriptParagraph,
} from "@/hooks/useRelationalEngine";
import { useUpsertPiece } from "@/hooks/useContent";
import { useScope } from "@/contexts/ScopeContext";
import { formatDateBR } from "@/lib/format";

export type RelationalSeed = {
  theme: string;
  hook?: string;
  anchor?: string;
  format?: "reel" | "carrossel" | "legenda";
  objective?: string;
  audienceContext?: string;
  myPerspective?: string;
  ideaId?: string;
  sourceLabel?: string;
  sourceOrigin?: string;
  onScriptReady?: (pieceId?: string) => void;
};

const OBJECTIVE_LABEL: Record<string, string> = {
  atrair_paciente: "Atrair paciente",
  autoridade: "Construir autoridade",
  identificacao: "Gerar identificação",
  ensinar: "Ensinar algo concreto",
};

const FORMAT_LABEL: Record<string, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  legenda: "Legenda",
};

const FORMAT_CHIPS = ["Reel", "Carrossel", "Legenda"];
const OBJECTIVE_CHIPS = ["Atrair paciente", "Construir autoridade", "Gerar identificação", "Ensinar algo concreto"];
const ANCHOR_CHIPS = ["IBCT", "Gottman", "IBCT + Gottman", "Só minha visão", "A IA decide"];

function displayFormat(value?: string) {
  if (!value) return "Formato";
  return FORMAT_LABEL[value] ?? value;
}

function displayObjective(value?: string) {
  if (!value) return "Objetivo";
  return OBJECTIVE_LABEL[value] ?? value;
}

function normalizeText(value?: string) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toContentFormat(value?: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("carrossel")) return "carrossel" as const;
  if (normalized.includes("legenda") || normalized.includes("texto")) return "texto" as const;
  return "reels" as const;
}

function seedFormatToText(value?: string) {
  return value ? FORMAT_LABEL[value] ?? value : "Reel";
}

function seedObjectiveToText(value?: string) {
  return value ? OBJECTIVE_LABEL[value] ?? value : "Gerar identificação";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado");
}

function HybridChipInput(props: {
  label: string;
  chips: string[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {props.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => props.onChange(chip)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              props.value === chip
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 text-sm"
        placeholder={props.placeholder}
      />
    </div>
  );
}

function formatTopicsAsScript(r: RelationalTopicsResult): string {
  const lines: string[] = [];
  lines.push(`ARCO: ${r.narrative_arc}\n`);
  lines.push(`GANCHO — ${r.hook.theme}\n${r.hook.guidance}\n`);
  r.topics.forEach((t, i) => {
    lines.push(`TÓPICO ${i + 1} — ${t.theme}\nPergunta para você responder: "${t.question ?? ""}"\nContexto: ${t.context ?? ""}\nÂncora clínica: ${t.clinical_anchor ?? ""}\n\nLinha guia: ${t.guidance}\n→ conecta: ${t.connects_to_next}\n`);
  });
  lines.push(`FECHAMENTO — ${r.closing.theme}\n${r.closing.guidance}`);
  return lines.join("\n");
}

function formatScriptAsText(r: RelationalScriptResult): string {
  return r.paragraphs.map((p) => p.text).join("\n\n");
}

// ═══════════════════════════════════════════════════════════
// TÓPICOS PARA GRAVAÇÃO — tema + parágrafo guia (não pergunta)
// ═══════════════════════════════════════════════════════════
function TopicsSubTab({ seed }: { seed?: RelationalSeed | null }) {
  const [theme, setTheme] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [format, setFormat] = useState("Reel");
  const [objective, setObjective] = useState("Gerar identificação");
  const [anchor, setAnchor] = useState("A IA decide");
  const [audienceContext, setAudienceContext] = useState("");
  const [voiceCalibration, setVoiceCalibration] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<RelationalTopicsResult | null>(null);
  const gen = useGenerateRelational();
  const upsertPiece = useUpsertPiece();
  const { scope } = useScope();

  useEffect(() => {
    if (!seed) return;
    setTheme(seed.theme ?? "");
    setMyPerspective(seed.myPerspective ?? "");
    setFormat(seedFormatToText(seed.format));
    setAnchor(seed.anchor ?? "A IA decide");
    setObjective(seedObjectiveToText(seed.objective));
    setAudienceContext(seed.audienceContext ?? "");
  }, [seed]);

  async function handleGenerate() {
    if (!theme.trim()) { toast.error("Informe o tema"); return; }
    if (!myPerspective.trim()) {
      toast.error("Este campo é o coração do conteúdo. Escreva o que você realmente pensa sobre esse tema antes de gerar.");
      return;
    }
    const promptParaAPI = `
Você é uma IA de criação de conteúdo para uma psicóloga clínica especializada em relacionamentos e terapia de casal (IBCT + Gottman).

TEMA OU IDEIA:
${theme.trim()}

O QUE A PSICÓLOGA PENSA SOBRE ESSE TEMA (campo central — use tudo isso):
${myPerspective.trim()}

FORMATO: ${format.trim()}
OBJETIVO: ${objective.trim()}
ANCORAGEM CLÍNICA: ${anchor.trim()}

COM BASE NISSO, gere os tópicos para gravação. 

REGRAS:
- O GANCHO deve ser uma frase ou pergunta específica que parte diretamente do que ela escreveu no campo "O que você pensa". Não invente um tema genérico.
- Cada TÓPICO deve ser uma pergunta real que ela responde na câmera. A pergunta deve partir do raciocínio dela, não de um conceito abstrato.
- O CONTEXTO de cada tópico deve citar algo específico que ela escreveu — não resumo genérico do tema.
- A ÂNCORA CLÍNICA deve ser o conceito de IBCT ou Gottman traduzido em comportamento cotidiano — nunca jargão solto.
- O FECHAMENTO deve indicar uma direção, não uma frase pronta.
- Se o campo "O que você pensa" contiver raciocínio incompleto, fragmentado ou ditado por voz, interprete a intenção — não descarte. Conecte os pontos e use o raciocínio que está ali.

FORMATO DE SAÍDA OBRIGATÓRIO (preencha todos os campos, nunca deixe vazio):

GANCHO
[frase ou pergunta de abertura — específica, vinda do raciocínio dela]

TÓPICO 1 — [nome do bloco]
Pergunta para você responder: "[pergunta real e específica]"
Contexto: [o que ela escreveu que sustenta este tópico]
Âncora clínica: [conceito em comportamento cotidiano]

TÓPICO 2 — [nome do bloco]
Pergunta para você responder: "[pergunta real e específica]"
Contexto: [...]
Âncora clínica: [...]

TÓPICO 3 — [nome do bloco] (adicionar mais se o tema pedir)
Pergunta para você responder: "[...]"
Contexto: [...]
Âncora clínica: [...]

FECHAMENTO
Direção: [não uma frase pronta — o que ela quer que a pessoa sinta ou faça depois de assistir]
`;
    const data = (await gen.mutateAsync({
      mode: "topics",
      theme: theme.trim(),
      my_perspective: myPerspective.trim(),
      objective: objective.trim(),
      format: format.trim(),
      anchor: anchor.trim(),
      prompt: promptParaAPI,
      audience_context: audienceContext.trim() || undefined,
      voice_calibration: voiceCalibration.trim() || undefined,
    })) as RelationalTopicsResult;
    setResult(data);
  }

  function updateBlock(kind: "hook" | "closing" | "topic", index: number, field: string, value: string) {
    if (!result) return;
    if (kind === "topic") {
      const topics = [...result.topics];
      topics[index] = { ...topics[index], [field]: value };
      setResult({ ...result, topics });
    } else {
      setResult({ ...result, [kind]: { ...result[kind], [field]: value } });
    }
  }

  function updateTopic(i: number, patch: Partial<RelationalTopicsResult["topics"][number]>) {
    if (!result) return;
    const topics = [...result.topics];
    topics[i] = { ...topics[i], ...patch };
    setResult({ ...result, topics });
  }

  function removeTopic(i: number) {
    if (!result) return;
    setResult({ ...result, topics: result.topics.filter((_, idx) => idx !== i) });
  }

  function addTopic() {
    if (!result) return;
    setResult({
      ...result,
      topics: [...result.topics, { theme: "Novo bloco", question: "", context: "", clinical_anchor: "", guidance: "", connects_to_next: "" }],
    });
  }

  function sendToProduction() {
    if (!result) return;
    const formatted = formatTopicsAsScript(result);
    upsertPiece.mutate({
      title: `${result.theme} — ${result.hook.theme}`.slice(0, 160),
      theme: result.theme,
      format: toContentFormat(result.format),
      status: "em_producao",
      pipeline_stage: "roteiro_pronto",
      clinical_anchor: anchor === "A IA decide" ? null : anchor,
      audience_context: audienceContext || null,
      hook: result.hook.guidance,
      script: formatted,
      notes: formatted,
      idea_id: seed?.ideaId ?? null,
      scope: (scope === "todos" ? "profissional" : scope) as any,
    } as any, { onSuccess: (piece) => { seed?.onScriptReady?.((piece as any)?.id); toast.success("Enviado ao Pipeline"); } });
  }

  return (
    <div className="space-y-4">
      {seed?.sourceLabel && (
        <Card className="p-3 border-accent/30 bg-accent/5">
          <p className="text-sm"><span className="font-medium">Desenvolvendo:</span> {seed.sourceLabel}</p>
        </Card>
      )}

      <div>
        <Label>Tema ou ideia</Label>
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-2" placeholder="Ex: o casal que parou de brigar" />
      </div>

      <div>
        <Label className="flex items-center gap-2">
          O que você pensa sobre esse tema
          <Badge variant="outline" className="text-[10px]">coração do conteúdo</Badge>
        </Label>
        <Textarea
          rows={5}
          value={myPerspective}
          onChange={(e) => setMyPerspective(e.target.value)}
          className="mt-2"
          placeholder="Sem filtro. O que você realmente acha — a leitura clínica, a observação que ninguém faz, o que você vê no consultório."
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Determina se o conteúdo soa como você ou como qualquer outra psicóloga.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HybridChipInput label="Formato" chips={FORMAT_CHIPS} value={format} onChange={setFormat} placeholder="Ou descreva o formato..." />
        <HybridChipInput label="Objetivo" chips={OBJECTIVE_CHIPS} value={objective} onChange={setObjective} placeholder="Ou descreva o objetivo..." />
        <HybridChipInput label="Ancoragem clínica" chips={ANCHOR_CHIPS} value={anchor} onChange={setAnchor} placeholder="Ou descreva a ancoragem que quer usar..." />
      </div>

      <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Contexto da audiência e calibração de voz
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-3 border-l-2 border-border">
          <div>
            <Label className="text-xs">Contexto da audiência (opcional)</Label>
            <Textarea rows={3} value={audienceContext} onChange={(e) => setAudienceContext(e.target.value)} className="mt-1.5" placeholder="Comentários, dúvidas e palavras que sua audiência usa." />
          </div>
          <div>
            <Label className="text-xs">Calibração de voz (opcional)</Label>
            <Textarea rows={3} value={voiceCalibration} onChange={(e) => setVoiceCalibration(e.target.value)} className="mt-1.5" placeholder="Cole aqui um trecho seu — uma legenda ou roteiro antigo. A IA vai espelhar seu ritmo e vocabulário." />
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={gen.isPending} size="lg" className="w-full">
        {gen.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Construindo arco narrativo…</> : <><Wand2 className="h-4 w-4 mr-2" />Gerar tópicos para gravação</>}
      </Button>

      {result && (
        <Card className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{displayFormat(result.format)}</Badge>
              <Badge variant="outline">{displayObjective(result.objective)}</Badge>
              <Badge variant="outline">{result.anchor}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(formatTopicsAsScript(result))}>
                <Copy className="h-3.5 w-3.5 mr-1" />Copiar
              </Button>
              <Button size="sm" onClick={sendToProduction} disabled={upsertPiece.isPending}>
                <Mic2 className="h-3.5 w-3.5 mr-1" />Enviar ao Pipeline
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 p-3 rounded-md">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Arco narrativo</p>
            <p className="text-sm italic">{result.narrative_arc}</p>
          </div>

          <BlockEditor
            badge="Gancho"
            theme={result.hook.theme}
            guidance={result.hook.guidance}
            onThemeChange={(v) => updateBlock("hook", 0, "theme", v)}
            onGuidanceChange={(v) => updateBlock("hook", 0, "guidance", v)}
          />

          {result.topics.map((t, i) => (
            <div key={i} className="relative group">
              <TopicEditor
                index={i}
                topic={t}
                onChange={(patch) => updateTopic(i, patch)}
              />
              <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeTopic(i)}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addTopic} className="w-full">+ Adicionar bloco</Button>

          <BlockEditor
            badge="Fechamento"
            theme={result.closing.theme}
            guidance={result.closing.guidance}
            onThemeChange={(v) => updateBlock("closing", 0, "theme", v)}
            onGuidanceChange={(v) => updateBlock("closing", 0, "guidance", v)}
          />

          <p className="text-[11px] text-muted-foreground border-t pt-3">
            Cada bloco é um <strong>tema + direção</strong>. Você fala com as próprias palavras, mantendo o fio.
          </p>
        </Card>
      )}
    </div>
  );
}

function BlockEditor(props: {
  badge: string;
  theme: string;
  guidance: string;
  connectsTo?: string;
  onThemeChange: (v: string) => void;
  onGuidanceChange: (v: string) => void;
  onConnectsChange?: (v: string) => void;
}) {
  return (
    <div className="border-l-2 border-accent pl-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase">{props.badge}</Badge>
        <Input
          value={props.theme}
          onChange={(e) => props.onThemeChange(e.target.value)}
          className="text-sm font-medium border-0 border-b rounded-none px-1 h-7 focus-visible:ring-0"
        />
      </div>
      <Textarea
        value={props.guidance}
        onChange={(e) => props.onGuidanceChange(e.target.value)}
        rows={3}
        className="text-sm resize-none"
        placeholder="Direção autoral — o que precisa ser dito aqui."
      />
      {props.onConnectsChange && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-muted-foreground mt-2 shrink-0">→ conecta:</span>
          <Input
            value={props.connectsTo ?? ""}
            onChange={(e) => props.onConnectsChange!(e.target.value)}
            className="text-xs italic h-7"
            placeholder="Como esse bloco abre o próximo"
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROTEIRO AUTORAL — texto livre, parágrafos editáveis individualmente
// ═══════════════════════════════════════════════════════════
function AuthoredScriptSubTab({ seed }: { seed?: RelationalSeed | null }) {
  const [theme, setTheme] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [voiceCalibration, setVoiceCalibration] = useState("");
  const [format, setFormat] = useState("reel");
  const [objective, setObjective] = useState("identificacao");
  const [anchor, setAnchor] = useState("auto");
  const [result, setResult] = useState<RelationalScriptResult | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [regenDirection, setRegenDirection] = useState("");
  const gen = useGenerateRelational();
  const upsertPiece = useUpsertPiece();
  const save = useSaveRelationalAsIdea();
  const { scope } = useScope();

  useEffect(() => {
    if (!seed) return;
    setTheme(seed.theme ?? "");
    setMyPerspective(seed.myPerspective ?? "");
    setFormat(seed.format ?? "reel");
    setAnchor(seed.anchor ?? "auto");
    setObjective(seed.objective ?? "identificacao");
  }, [seed]);

  async function handleGenerate() {
    if (!theme.trim()) { toast.error("Informe o tema"); return; }
    const data = (await gen.mutateAsync({
      mode: "single",
      theme: theme.trim(),
      my_perspective: myPerspective.trim(),
      voice_calibration: voiceCalibration.trim() || undefined,
      objective, format, anchor,
    })) as RelationalScriptResult;
    setResult(data);
  }

  function updateParagraph(i: number, text: string) {
    if (!result) return;
    const paragraphs = [...result.paragraphs];
    paragraphs[i] = { ...paragraphs[i], text };
    setResult({ ...result, paragraphs });
  }

  async function regenerateParagraph(i: number) {
    if (!result) return;
    const original = result.paragraphs[i];
    const fullContext = result.paragraphs.map((p, idx) => `[${idx === i ? ">>" : "  "}] ${p.text}`).join("\n\n");
    const data = await gen.mutateAsync({
      mode: "regen_paragraph",
      role: original.role,
      original: original.text,
      full_context: fullContext,
      direction: regenDirection.trim() || "torne mais natural, direto e na minha voz",
      my_perspective: myPerspective.trim(),
      voice_calibration: voiceCalibration.trim() || undefined,
    }) as { text: string };
    updateParagraph(i, data.text);
    setRegenIndex(null);
    setRegenDirection("");
    toast.success("Parágrafo reescrito");
  }

  function removeParagraph(i: number) {
    if (!result) return;
    setResult({ ...result, paragraphs: result.paragraphs.filter((_, idx) => idx !== i) });
  }

  function addParagraph(after: number) {
    if (!result) return;
    const paragraphs = [...result.paragraphs];
    paragraphs.splice(after + 1, 0, { role: "desenvolvimento", text: "" });
    setResult({ ...result, paragraphs });
  }

  function sendToProduction() {
    if (!result) return;
    const text = formatScriptAsText(result);
    upsertPiece.mutate({
      title: `${result.theme}`.slice(0, 160),
      theme: result.theme,
      format: ({ reel: "reels", carrossel: "carrossel", legenda: "texto" } as const)[result.format],
      status: "em_producao",
      pipeline_stage: "roteiro_pronto",
      clinical_anchor: anchor === "auto" ? null : anchor,
      hook: result.paragraphs[0]?.text ?? null,
      script: text,
      notes: text,
      idea_id: seed?.ideaId ?? null,
      scope: (scope === "todos" ? "profissional" : scope) as any,
    } as any, { onSuccess: (piece) => { seed?.onScriptReady?.((piece as any)?.id); toast.success("Enviado ao Pipeline"); } });
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Roteiro em texto corrido com voz de fala. Cada parágrafo é editável e pode ser reescrito individualmente sem perder o resto.
        </p>
      </Card>

      <div>
        <Label>Tema</Label>
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-2" />
      </div>

      <div>
        <Label>O que você pensa sobre isso</Label>
        <Textarea rows={4} value={myPerspective} onChange={(e) => setMyPerspective(e.target.value)} className="mt-2" placeholder="Sua leitura clínica autêntica." />
      </div>

      <div>
        <Label className="flex items-center gap-2">Calibração de voz <Badge variant="outline" className="text-[10px]">recomendado</Badge></Label>
        <Textarea rows={3} value={voiceCalibration} onChange={(e) => setVoiceCalibration(e.target.value)} className="mt-2" placeholder="Cole 1-2 trechos seus (legendas ou falas anteriores). A IA vai espelhar seu ritmo." />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Formato</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(FORMAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Objetivo</Label>
          <Select value={objective} onValueChange={setObjective}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(OBJECTIVE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ancoragem</Label>
          <Select value={anchor} onValueChange={setAnchor}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">A IA decide</SelectItem>
              <SelectItem value="IBCT">IBCT</SelectItem>
              <SelectItem value="Gottman">Gottman</SelectItem>
              <SelectItem value="IBCT+Gottman">IBCT + Gottman</SelectItem>
              <SelectItem value="sem_nomear">Sem nomear</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} size="lg" className="w-full">
        {gen.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Escrevendo na sua voz…</> : <><FileText className="h-4 w-4 mr-2" />Gerar roteiro autoral</>}
      </Button>

      {result && (
        <Card className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{FORMAT_LABEL[result.format]}</Badge>
              <Badge variant="outline">{result.paragraphs.length} parágrafos</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(formatScriptAsText(result))}>
                <Copy className="h-3.5 w-3.5 mr-1" />Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={() => save.mutate({
                title: result.theme,
                theme: result.theme,
                full_text: formatScriptAsText(result),
                format: result.format,
                anchor: result.anchor,
                objective: result.objective,
              })}>
                <Save className="h-3.5 w-3.5 mr-1" />Salvar
              </Button>
              <Button size="sm" onClick={sendToProduction} disabled={upsertPiece.isPending}>
                <Mic2 className="h-3.5 w-3.5 mr-1" />Pipeline
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {result.paragraphs.map((p, i) => (
              <div key={i} className="group relative border-l-2 border-border hover:border-accent/50 pl-3 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] uppercase">{p.role}</Badge>
                  <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRegenIndex(regenIndex === i ? null : i)}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addParagraph(i)}>
                      <span className="text-xs">+</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeParagraph(i)}>
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={p.text}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  rows={Math.max(2, Math.ceil(p.text.length / 90))}
                  className="text-sm resize-none border-0 px-0 focus-visible:ring-0 leading-relaxed"
                />
                {regenIndex === i && (
                  <div className="mt-2 p-2 bg-muted/40 rounded space-y-2">
                    <Input
                      value={regenDirection}
                      onChange={(e) => setRegenDirection(e.target.value)}
                      placeholder="Direção: ex: 'mais curto', 'mais concreto', 'comece pela cena'"
                      className="text-xs h-8"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => regenerateParagraph(i)} disabled={gen.isPending}>
                        {gen.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reescrever"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRegenIndex(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VARIAÇÕES — 3 ângulos diferentes do mesmo tema
// ═══════════════════════════════════════════════════════════
function VariationsSubTab({ seed }: { seed?: RelationalSeed | null }) {
  const [theme, setTheme] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [audienceContext, setAudienceContext] = useState("");
  const [result, setResult] = useState<RelationalVariationsResult | null>(null);
  const gen = useGenerateRelational();

  useEffect(() => {
    if (!seed) return;
    setTheme(seed.theme ?? "");
    setMyPerspective(seed.myPerspective ?? "");
    setAudienceContext(seed.audienceContext ?? "");
  }, [seed]);

  async function handleGenerate() {
    if (!theme.trim()) { toast.error("Informe o tema"); return; }
    const data = (await gen.mutateAsync({
      mode: "variations",
      theme: theme.trim(),
      my_perspective: myPerspective.trim(),
      audience_context: audienceContext.trim() || undefined,
    })) as RelationalVariationsResult;
    setResult(data);
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          3 ângulos radicalmente diferentes para o mesmo tema. Use antes de gravar para escolher a porta de entrada certa.
        </p>
      </Card>

      <div>
        <Label>Tema</Label>
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-2" />
      </div>
      <div>
        <Label>O que você pensa sobre isso (opcional)</Label>
        <Textarea rows={3} value={myPerspective} onChange={(e) => setMyPerspective(e.target.value)} className="mt-2" />
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} size="lg" className="w-full">
        {gen.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mapeando ângulos…</> : <><Compass className="h-4 w-4 mr-2" />Gerar 3 ângulos</>}
      </Button>

      {result && (
        <div className="grid gap-3 md:grid-cols-3">
          {result.variations.map((v, i) => (
            <Card key={i} className="p-4 space-y-3 hover:border-accent/50 transition-colors">
              <Badge variant="secondary" className="text-[10px]">Ângulo {i + 1}</Badge>
              <h4 className="font-display font-semibold text-sm">{v.angle_name}</h4>
              <p className="text-sm italic border-l-2 border-accent/40 pl-2">{v.one_liner}</p>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Como abrir</p>
                <p className="text-xs leading-relaxed">{v.opening_idea}</p>
              </div>
              <div className="bg-muted/30 p-2 rounded text-xs">
                <span className="text-muted-foreground">Por quê: </span>{v.why_this_works}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SÉRIE — N conteúdos conectados
// ═══════════════════════════════════════════════════════════
function SeriesSubTab() {
  const [theme, setTheme] = useState("");
  const [myPerspective, setMyPerspective] = useState("");
  const [pieceCount, setPieceCount] = useState("5");
  const [result, setResult] = useState<RelationalSeriesResult | null>(null);
  const gen = useGenerateRelational();
  const save = useSaveRelationalAsIdea();

  async function handleGenerate() {
    if (!theme.trim()) { toast.error("Informe o tema central"); return; }
    const data = (await gen.mutateAsync({
      mode: "series",
      theme: theme.trim(),
      my_perspective: myPerspective.trim(),
      piece_count: Number(pieceCount),
    })) as RelationalSeriesResult;
    setResult(data);
  }

  function saveAll() {
    if (!result) return;
    Promise.all(
      result.pieces.map((p) =>
        save.mutateAsync({
          title: `[${result.series_name} ${p.order}/${result.pieces.length}] ${p.theme}`,
          theme: p.theme,
          full_text: `${p.one_liner}\n\n${p.guidance}\n\n→ conecta com anterior: ${p.builds_on_previous}`,
          format: p.format,
        }),
      ),
    ).then(() => toast.success(`${result.pieces.length} posts salvos no Banco`));
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Série de posts que se desenvolvem como uma conversa. Cada um abre o próximo. Não são posts soltos sobre o mesmo assunto.
        </p>
      </Card>

      <div>
        <Label>Tema central</Label>
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-2" placeholder="Ex: como casais que ficam juntos lidam com conflito" />
      </div>
      <div>
        <Label>Sua leitura sobre o tema</Label>
        <Textarea rows={3} value={myPerspective} onChange={(e) => setMyPerspective(e.target.value)} className="mt-2" />
      </div>
      <div className="max-w-xs">
        <Label>Quantos posts</Label>
        <Select value={pieceCount} onValueChange={setPieceCount}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 posts</SelectItem>
            <SelectItem value="5">5 posts</SelectItem>
            <SelectItem value="7">7 posts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} size="lg" className="w-full">
        {gen.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Construindo arco da série…</> : <><Layers3 className="h-4 w-4 mr-2" />Gerar série conectada</>}
      </Button>

      {result && (
        <Card className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-display font-semibold">{result.series_name}</h3>
              <p className="text-xs italic text-muted-foreground mt-1">{result.narrative_arc}</p>
            </div>
            <Button size="sm" onClick={saveAll} disabled={save.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />Salvar todos no Banco
            </Button>
          </div>

          <div className="space-y-3">
            {result.pieces.map((p) => (
              <Card key={p.order} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{p.order}/{result.pieces.length}</Badge>
                  <Badge variant="outline" className="text-[10px]">{FORMAT_LABEL[p.format]}</Badge>
                  <span className="text-sm font-medium">{p.theme}</span>
                </div>
                <p className="text-sm italic">{p.one_liner}</p>
                <p className="text-xs text-muted-foreground">{p.guidance}</p>
                {p.order > 1 && (
                  <p className="text-[11px] text-muted-foreground border-l-2 border-accent/30 pl-2 italic">
                    ↳ vem do anterior: {p.builds_on_previous}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BANCO — pautas salvas
// ═══════════════════════════════════════════════════════════
function BankSubTab() {
  const { data: ideas = [], isLoading } = useRelationalIdeas();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tudo que você salvou do Motor Relacional. Tópicos, roteiros e séries.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (ideas as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nenhuma pauta salva ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {(ideas as any[]).map((idea) => (
            <Card key={idea.id} className="p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{idea.suggested_format}</Badge>
                <span className="text-[10px] text-muted-foreground">{formatDateBR(idea.created_at)}</span>
                {idea.used && <Badge className="text-[10px]">usada</Badge>}
                <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => copyToClipboard(idea.notes ?? idea.title)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm font-medium mb-1">{idea.title}</p>
              {idea.notes && (
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{idea.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════
export function RelationalEngineTab({ seed }: { seed?: RelationalSeed | null }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Motor Relacional</p>
            <p className="text-xs text-muted-foreground mt-1">
              4 modos de criação clínica autoral. Sua voz, sua leitura, com fio narrativo.
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="topicos">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="topicos"><Mic2 className="h-3.5 w-3.5 mr-1" />Tópicos para gravar</TabsTrigger>
          <TabsTrigger value="roteiro"><FileText className="h-3.5 w-3.5 mr-1" />Roteiro autoral</TabsTrigger>
          <TabsTrigger value="angulos"><Compass className="h-3.5 w-3.5 mr-1" />3 ângulos</TabsTrigger>
          <TabsTrigger value="serie"><Layers3 className="h-3.5 w-3.5 mr-1" />Série conectada</TabsTrigger>
          <TabsTrigger value="banco"><Library className="h-3.5 w-3.5 mr-1" />Banco</TabsTrigger>
        </TabsList>

        <TabsContent value="topicos" className="mt-4"><TopicsSubTab seed={seed} /></TabsContent>
        <TabsContent value="roteiro" className="mt-4"><AuthoredScriptSubTab seed={seed} /></TabsContent>
        <TabsContent value="angulos" className="mt-4"><VariationsSubTab seed={seed} /></TabsContent>
        <TabsContent value="serie" className="mt-4"><SeriesSubTab /></TabsContent>
        <TabsContent value="banco" className="mt-4"><BankSubTab /></TabsContent>
      </Tabs>
    </div>
  );
}
