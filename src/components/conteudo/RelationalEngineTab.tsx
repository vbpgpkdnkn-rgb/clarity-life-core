import { useState } from "react";
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
  Heart,
  Wand2,
  Loader2,
  Copy,
  CheckCircle2,
  Save,
  Clock,
  Layers,
  Library,
  Mic2,
  FileText,
  XCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGenerateRelational,
  useSaveRelationalAsIdea,
  useRelationalIdeas,
  type RelationalSingleResult,
  type RelationalTimedResult,
  type RelationalBatchResult,
} from "@/hooks/useRelationalEngine";
import { formatDateBR } from "@/lib/format";

const THEME_PRESETS = [
  "o casal que convive mas não se conecta",
  "a briga que sempre volta sem nunca resolver",
  "quando um persegue e o outro foge",
  "o silêncio que virou distância",
  "dependência emocional — precisar demais",
  "a crítica que virou o idioma do casal",
  "quando o stonewalling aparece",
  "perda de amizade dentro do relacionamento",
  "ciúme como rastreador de insegurança",
  "o ciclo de polarização — opostos que se destroem",
  "o casal que não briga mas também não se aproxima",
  "quando um dos dois carrega tudo",
];

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

const ANCHOR_LABEL: Record<string, string> = {
  IBCT: "IBCT",
  Gottman: "Gottman",
  "IBCT+Gottman": "IBCT + Gottman",
  sem_nomear: "Sem nomear — só a lógica",
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado");
}

// ─────────────────────────────────────────────
// SUB-TAB 1: Gerador único
// ─────────────────────────────────────────────
function GeneratorSubTab() {
  const [theme, setTheme] = useState("");
  const [insight, setInsight] = useState("");
  const [objective, setObjective] = useState("identificacao");
  const [format, setFormat] = useState("reel");
  const [anchor, setAnchor] = useState("IBCT+Gottman");
  const [result, setResult] = useState<RelationalSingleResult | null>(null);
  const gen = useGenerateRelational();
  const save = useSaveRelationalAsIdea();

  async function handleGenerate() {
    const finalTheme = insight.trim() || theme.trim();
    if (!finalTheme) {
      toast.error("Escolha um tema ou descreva o insight");
      return;
    }
    const data = (await gen.mutateAsync({
      mode: "single",
      theme: finalTheme,
      objective,
      format,
      anchor,
    })) as RelationalSingleResult;
    setResult(data);
  }

  function handleSave() {
    if (!result) return;
    save.mutate({
      title: result.opening.slice(0, 120),
      theme: result.theme,
      full_text: result.full_text,
      format: result.format,
      anchor: result.anchor,
      objective: result.objective,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tema relacional</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="— selecione um tema —" />
            </SelectTrigger>
            <SelectContent>
              {THEME_PRESETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ancoragem clínica</Label>
          <Select value={anchor} onValueChange={setAnchor}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ANCHOR_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Ou descreva o insight que quer explorar
        </Label>
        <Textarea
          value={insight}
          onChange={(e) => setInsight(e.target.value)}
          placeholder="Ex: aquela coisa de querer que o outro adivinhe o que você precisa…"
          rows={2}
          className="mt-2"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</Label>
          <Select value={objective} onValueChange={setObjective}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OBJECTIVE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Formato</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} className="w-full" size="lg">
        {gen.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando com voz clínica…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Gerar conteúdo
          </>
        )}
      </Button>

      {result && (
        <Card className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{OBJECTIVE_LABEL[result.objective]}</Badge>
              <Badge variant="outline">{FORMAT_LABEL[result.format]}</Badge>
              <Badge variant="outline">{ANCHOR_LABEL[result.anchor]}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.full_text)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={save.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Salvar como ideia
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Conteúdo final</p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-md">
              {result.full_text}
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Ver camadas do motor narrativo
            </summary>
            <div className="mt-3 space-y-3">
              {[
                ["Abertura", result.opening],
                ["Nomeação do padrão", result.pattern_naming],
                ["Ancoragem clínica", result.clinical_anchor],
                ["Insight reframe", result.reframe_insight],
                ["Fechamento", result.closing],
              ].map(([k, v]) => (
                <div key={k} className="border-l-2 border-accent/40 pl-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
                  <p className="text-sm">{v}</p>
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-TAB 2: Script por tempo
// ─────────────────────────────────────────────
function TimedScriptSubTab() {
  const [theme, setTheme] = useState("");
  const [duration, setDuration] = useState("60");
  const [objective, setObjective] = useState("identificacao");
  const [result, setResult] = useState<RelationalTimedResult | null>(null);
  const gen = useGenerateRelational();

  async function handleGenerate() {
    if (!theme.trim()) {
      toast.error("Descreva o tema ou insight");
      return;
    }
    const data = (await gen.mutateAsync({
      mode: "timed",
      theme: theme.trim(),
      duration_seconds: Number(duration),
      objective,
    })) as RelationalTimedResult;
    setResult(data);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tema ou insight</Label>
        <Textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex: o casal que parou de brigar e isso não é bom sinal"
          rows={2}
          className="mt-2"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Duração</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">60s</SelectItem>
              <SelectItem value="90">90s</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</Label>
          <Select value={objective} onValueChange={setObjective}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="atrair_paciente">Atrair paciente</SelectItem>
              <SelectItem value="autoridade">Construir autoridade</SelectItem>
              <SelectItem value="identificacao">Gerar identificação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} className="w-full" size="lg">
        {gen.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Mapeando segundo a segundo…
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 mr-2" />
            Gerar script com marcação de tempo
          </>
        )}
      </Button>

      {result && (
        <Card className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{result.duration_seconds}s</Badge>
              <Badge variant="outline">{OBJECTIVE_LABEL[result.objective]}</Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const txt = result.blocks
                  .map((b) => `[${b.start}-${b.end}s] ${b.label.toUpperCase()}\n${b.text}\n(direção: ${b.direction})`)
                  .join("\n\n");
                copyToClipboard(`${txt}\n\n— TEXTO NA TELA —\n${result.on_screen_text}\n\n— LEGENDA —\n${result.caption}`);
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar tudo
            </Button>
          </div>

          <div className="space-y-3">
            {result.blocks.map((b, i) => (
              <div key={i} className="border-l-2 border-accent/50 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {b.start}–{b.end}s
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {b.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{b.text}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">↳ {b.direction}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-muted/30 p-3 rounded-md">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Texto na tela
              </p>
              <p className="text-sm">{result.on_screen_text}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-md">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Legenda</p>
              <p className="text-sm whitespace-pre-wrap">{result.caption}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-TAB 3: Lote
// ─────────────────────────────────────────────
function BatchSubTab() {
  const [quantity, setQuantity] = useState("3");
  const [focus, setFocus] = useState("");
  const [mix, setMix] = useState("distribuir");
  const [result, setResult] = useState<RelationalBatchResult | null>(null);
  const gen = useGenerateRelational();
  const save = useSaveRelationalAsIdea();

  async function handleGenerate() {
    const data = (await gen.mutateAsync({
      mode: "batch",
      quantity: Number(quantity),
      focus,
      mix,
    })) as RelationalBatchResult;
    setResult(data);
  }

  function handleSaveAll() {
    if (!result) return;
    Promise.all(
      result.items.map((item) =>
        save.mutateAsync({
          title: item.opening.slice(0, 120),
          theme: item.theme,
          full_text: item.full_text,
          format: item.format,
          anchor: "IBCT+Gottman",
          objective: item.objective,
        }),
      ),
    ).then(() => toast.success(`${result.items.length} ideias salvas`));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quantidade</Label>
          <Select value={quantity} onValueChange={setQuantity}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 conteúdos</SelectItem>
              <SelectItem value="5">5 conteúdos</SelectItem>
              <SelectItem value="7">7 conteúdos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Foco do período (opcional)
          </Label>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Ex: semana sobre stonewalling"
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mix de objetivos</Label>
        <Select value={mix} onValueChange={setMix}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distribuir">Distribuir automaticamente</SelectItem>
            <SelectItem value="atrair_paciente">Tudo para atrair paciente</SelectItem>
            <SelectItem value="autoridade">Tudo para autoridade</SelectItem>
            <SelectItem value="identificacao">Tudo para identificação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={gen.isPending} className="w-full" size="lg">
        {gen.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Construindo lote…
          </>
        ) : (
          <>
            <Layers className="h-4 w-4 mr-2" />
            Gerar lote
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveAll} disabled={save.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar todos como ideias
            </Button>
          </div>
          {result.items.map((item, i) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{OBJECTIVE_LABEL[item.objective]}</Badge>
                <Badge variant="outline">{FORMAT_LABEL[item.format]}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {item.theme}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7"
                  onClick={() => copyToClipboard(item.full_text)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm font-medium">{item.opening}</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {item.full_text}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-TAB 4: Banco de pautas
// ─────────────────────────────────────────────
function BankSubTab() {
  const { data: ideas = [], isLoading } = useRelationalIdeas();
  const [filter, setFilter] = useState("todos");

  const filtered = (ideas as any[]).filter((i) => {
    if (filter === "todos") return true;
    return (i.source ?? "").toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Filtrar por ancoragem
        </Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="mt-2 max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ibct">IBCT</SelectItem>
            <SelectItem value="gottman">Gottman</SelectItem>
            <SelectItem value="atrair_paciente">Atrair paciente</SelectItem>
            <SelectItem value="autoridade">Autoridade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nenhuma pauta salva ainda. Gere conteúdos e salve como ideia.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((idea) => (
            <Card key={idea.id} className="p-3 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {idea.suggested_format}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDateBR(idea.created_at)}
                </span>
                {idea.used && <Badge className="text-[10px]">usada</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7"
                  onClick={() => copyToClipboard(idea.notes ?? idea.title)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm font-medium mb-1">{idea.title}</p>
              {idea.notes && (
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {idea.notes}
                </p>
              )}
              {idea.source && (
                <p className="text-[10px] text-muted-foreground mt-2 italic">{idea.source}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-TAB 5: Guia de voz
// ─────────────────────────────────────────────
function VoiceGuideSubTab() {
  const items = [
    {
      title: "Como abrir — gancho",
      wrong: ['"Você sabia que a comunicação é fundamental?"', '"Isso não é amor, é outra coisa."'],
      right:
        '"Tem uma coisa que aparece em quase todos os casais que chegam ao consultório — e que nenhum dos dois percebe até alguém apontar."',
    },
    {
      title: "Como nomear o padrão",
      wrong: ['"Isso não é comunicação, é repetição emocional."'],
      right:
        '"A discussão não é sobre a louça. Nunca foi. A louça é só onde a coisa apareceu dessa vez — mas o que está sendo negociado ali é muito mais antigo e mais fundo do que qualquer louça."',
    },
    {
      title: "Como traduzir IBCT e Gottman",
      wrong: ['"A IBCT trabalha com a aceitação terapêutica do outro."'],
      right:
        '"Existe uma diferença entre tentar mudar seu parceiro e conseguir enxergá-lo com clareza. Quando você para de brigar contra quem ele é — não porque desistiu, mas porque entendeu de onde ele vem — o relacionamento começa a funcionar de um jeito completamente diferente."',
    },
    {
      title: "Como fechar — sem clichê",
      wrong: ['"Se isso fez sentido, você já sabe o que fazer."', '"Você merece um relacionamento saudável."'],
      right:
        '"Se você se reconheceu nisso, não é coincidência. É o seu sistema nervoso te dizendo que essa leitura faz sentido. E quando você consegue ver o padrão com clareza — o que você faz com ele muda completamente."',
    },
    {
      title: "Regra geral de tom",
      wrong: [],
      right:
        '"Fale como quem senta na frente de alguém e diz algo que ela nunca ouviu dito assim. Direto, sem rodeios, sem julgamento. Didático no sentido real — não simplificando, mas traduzindo. Como se você estivesse explicando algo complexo para uma amiga muito inteligente que não é da área."',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Referência de como a IA está calibrada. O que está proibido e como soa a versão certa.
      </p>
      {items.map((it, i) => (
        <Card key={i} className="p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">
            {it.title}
          </p>
          {it.wrong.map((w, j) => (
            <div key={j} className="flex items-start gap-2 mb-2 text-sm">
              <XCircle className="h-3.5 w-3.5 mt-0.5 text-destructive/60 shrink-0" />
              <span className="text-muted-foreground line-through">{w}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 mt-2">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
            <p className="text-sm italic border-l-2 border-accent pl-3 leading-relaxed">{it.right}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-TAB 6: System prompt (read-only)
// ─────────────────────────────────────────────
function SystemPromptSubTab() {
  const description = `O system prompt clínico está configurado e fixo no backend (edge function 'relational-content-engine'). 
Ele contém: identidade clínica (psicóloga IBCT + Gottman), motor narrativo de 5 camadas (abertura → nomeação → ancoragem → reframe → fechamento), guia de voz com proibições explícitas (sem "você sabia", sem clichê de coach, sem emoji decorativo), temas de domínio (4 cavaleiros, perseguidor/distanciador, stonewalling, polarização etc.) e exemplos de tom certo vs errado.

Toda geração desta aba passa por esse prompt antes de chegar na sua tela.`;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold">Configuração clínica ativa</p>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{description}</p>
      </Card>

      <Card className="p-5 bg-muted/20">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Camadas do motor
        </p>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>
            <strong>Abertura</strong> — observação clínica que para o scroll (nunca pergunta retórica).
          </li>
          <li>
            <strong>Nomeação do padrão</strong> — clareza técnica traduzida.
          </li>
          <li>
            <strong>Ancoragem clínica</strong> — IBCT, Gottman ou só a lógica.
          </li>
          <li>
            <strong>Insight reframe</strong> — vira a chave, sem moralizar.
          </li>
          <li>
            <strong>Fechamento</strong> — autoridade invisível, sem CTA explícito.
          </li>
        </ol>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT PRINCIPAL
// ─────────────────────────────────────────────
export function RelationalEngineTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4 border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Motor de Conteúdo — Psicologia de Relacionamentos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Voz clínica humanizada · IBCT + Método Gottman · tom de especialista · sem clichê de IA
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="gerador">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="gerador">
            <Wand2 className="h-3.5 w-3.5 mr-1" />
            Gerador
          </TabsTrigger>
          <TabsTrigger value="tempo">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Script por tempo
          </TabsTrigger>
          <TabsTrigger value="lote">
            <Layers className="h-3.5 w-3.5 mr-1" />
            Lote
          </TabsTrigger>
          <TabsTrigger value="banco">
            <Library className="h-3.5 w-3.5 mr-1" />
            Banco de pautas
          </TabsTrigger>
          <TabsTrigger value="voz">
            <Mic2 className="h-3.5 w-3.5 mr-1" />
            Guia de voz
          </TabsTrigger>
          <TabsTrigger value="prompt">
            <FileText className="h-3.5 w-3.5 mr-1" />
            System prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerador" className="mt-4">
          <GeneratorSubTab />
        </TabsContent>
        <TabsContent value="tempo" className="mt-4">
          <TimedScriptSubTab />
        </TabsContent>
        <TabsContent value="lote" className="mt-4">
          <BatchSubTab />
        </TabsContent>
        <TabsContent value="banco" className="mt-4">
          <BankSubTab />
        </TabsContent>
        <TabsContent value="voz" className="mt-4">
          <VoiceGuideSubTab />
        </TabsContent>
        <TabsContent value="prompt" className="mt-4">
          <SystemPromptSubTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
