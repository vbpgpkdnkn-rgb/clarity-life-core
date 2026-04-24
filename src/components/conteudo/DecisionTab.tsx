import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Wand2,
  Loader2,
  Copy,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Flame,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/contexts/ScopeContext";
import { strategyToBriefing, useContentStrategy } from "@/hooks/useContentStrategy";
import {
  StrategicContentResult,
  useDeleteStrategicScript,
  useGenerateStrategicContent,
  useSaveStrategicScript,
  useStrategicScripts,
} from "@/hooks/useStrategicContent";
import { useUpsertIdea } from "@/hooks/useContent";

const INTENTS = [
  "gerar identificação emocional",
  "criar desconforto psicológico",
  "gerar desejo por terapia",
  "posicionar autoridade clínica",
  "quebrar crença limitante",
];

const FORMATS = ["reels", "carrossel", "texto", "stories", "video"];

const CRIT_LABEL = {
  generates_pain: "Gera dor real?",
  generates_identification: "Faz a pessoa se ver?",
  creates_urgency: "Cria urgência emocional?",
} as const;

export function DecisionTab() {
  const { scope } = useScope();
  const effectiveScope = scope === "todos" ? "profissional" : (scope as "pessoal" | "profissional");
  const { data: strategy } = useContentStrategy(effectiveScope);
  const briefing = useMemo(() => strategyToBriefing(strategy), [strategy]);

  const [angle, setAngle] = useState("");
  const [intentHint, setIntentHint] = useState<string>("auto");
  const [formatHint, setFormatHint] = useState<string>("auto");
  const [result, setResult] = useState<StrategicContentResult | null>(null);

  const generate = useGenerateStrategicContent();
  const save = useSaveStrategicScript();
  const delScript = useDeleteStrategicScript();
  const upsertIdea = useUpsertIdea();
  const { data: history = [] } = useStrategicScripts();

  const recentHooks = useMemo(
    () => (history as any[]).slice(0, 8).map((h) => h.hook).filter(Boolean),
    [history],
  );

  const doGenerate = async (refine = false) => {
    try {
      const res = await generate.mutateAsync({
        briefing,
        angle: angle.trim() || undefined,
        intent: intentHint !== "auto" ? intentHint : undefined,
        format: formatHint !== "auto" ? formatHint : undefined,
        avoid: recentHooks,
        refine_from: refine ? result : null,
      });
      setResult(res);
    } catch {
      /* toast já tratado */
    }
  };

  const doSaveAsIdea = async () => {
    if (!result) return;
    // 1. salva como ideia editorial
    const ideaPayload: any = {
      title: result.hook,
      theme: result.theme,
      suggested_format: result.format,
      notes: `INTENT: ${result.intent}\nTRIGGER: ${result.trigger}\nCONFLITO: ${result.conflict}\nINSIGHT: ${result.insight}\n\nROTEIRO:\n${result.script}\n\nCTA: ${result.cta}\n\nDECISÃO: ${result.decision.verdict.toUpperCase()} (score ${result.score}/3) — ${result.decision.verdict_reason}`,
      scope: effectiveScope,
      source: "IA estratégica",
    };
    const { data: ideaRow, error } = await (await import("@/integrations/supabase/client"))
      .supabase.from("content_ideas" as any)
      .insert(ideaPayload)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    // 2. salva o roteiro estratégico apontando pra ideia
    await save.mutateAsync({
      ...result,
      scope: effectiveScope,
      saved_as_idea_id: (ideaRow as any)?.id ?? null,
    });
    toast.success("Salvo como ideia editorial");
  };

  const doCopy = async () => {
    if (!result) return;
    const text = `HOOK: ${result.hook}\n\nROTEIRO:\n${result.script}\n\nCTA: ${result.cta}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-4">
      {/* INTRO */}
      <Card className="p-4 border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-accent/15 p-2 shrink-0">
            <Brain className="h-5 w-5 text-accent" />
          </div>
          <div className="text-sm leading-relaxed">
            <div className="font-display font-semibold mb-1">Decisão antes de postar</div>
            <p className="text-muted-foreground">
              A IA monta o conteúdo em camadas (intent → trigger → conflito → hook → insight → roteiro → CTA invisível) e roda o filtro de decisão: <strong>gera dor? gera identificação? cria urgência?</strong> Se reprovar, ela diz por quê — você decide se posta.
            </p>
            {!briefing && (
              <p className="text-warning text-xs mt-2">
                ⚠ Configure sua Estratégia de Conteúdo (botão no topo) — sem isso a IA chuta o nicho.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* FORM */}
      <Card className="p-4 space-y-3">
        <div>
          <Label className="text-xs">Ângulo / direção (opcional)</Label>
          <Textarea
            placeholder="Ex: relacionamento que esfriou, mulher que justifica o silêncio do parceiro…"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            rows={2}
            className="mt-1 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Intent</Label>
            <Select value={intentHint} onValueChange={setIntentHint}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">IA decide</SelectItem>
                {INTENTS.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Formato</Label>
            <Select value={formatHint} onValueChange={setFormatHint}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">IA decide</SelectItem>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => doGenerate(false)} disabled={generate.isPending} className="w-full">
          {generate.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Construindo camadas…</>
          ) : (
            <><Wand2 className="h-4 w-4 mr-1" /> Gerar conteúdo estratégico</>
          )}
        </Button>
      </Card>

      {/* RESULT */}
      {result && (
        <Card className="p-4 space-y-4">
          {/* Decision summary */}
          <DecisionBlock result={result} />

          {/* Layers */}
          <div className="space-y-2">
            <LayerLine label="Intent" value={result.intent} icon={<Target className="h-3.5 w-3.5" />} />
            <LayerLine label="Trigger" value={result.trigger} icon={<Flame className="h-3.5 w-3.5" />} />
            <LayerLine label="Conflito" value={result.conflict} />
            <LayerLine label="Insight" value={result.insight} />
          </div>

          {/* Hook destaque */}
          <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Hook (0-3s)</div>
            <p className="font-display text-base leading-snug">{result.hook}</p>
          </div>

          {/* Script */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Roteiro</div>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-muted/30 rounded-md p-3">
              {result.script}
            </pre>
          </div>

          {/* CTA */}
          <div className="rounded-md border border-border/60 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">CTA invisível</div>
            <p className="text-sm italic">"{result.cta}"</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={doSaveAsIdea} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar como ideia
            </Button>
            <Button size="sm" variant="outline" onClick={doCopy}>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
            <Button size="sm" variant="outline" onClick={() => doGenerate(true)} disabled={generate.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refazer mais afiado
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
              Novo
            </Button>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {result.format} · {result.theme}
            </Badge>
          </div>
        </Card>
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Roteiros anteriores
          </div>
          <div className="space-y-1.5">
            {(history as any[]).slice(0, 10).map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 text-sm rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40"
              >
                <button
                  onClick={() => setResult(h)}
                  className="flex-1 text-left truncate"
                  title={h.hook}
                >
                  <span className="font-medium">{h.hook}</span>
                </button>
                <Badge variant="outline" className="text-[9px]">{h.score}/3</Badge>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    h.decision?.verdict === "postar"
                      ? "border-success/40 text-success"
                      : h.decision?.verdict === "refazer"
                        ? "border-warning/40 text-warning"
                        : "border-destructive/40 text-destructive"
                  }`}
                >
                  {h.decision?.verdict ?? "?"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => delScript.mutate(h.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LayerLine({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 shrink-0 pt-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="flex-1">{value}</div>
    </div>
  );
}

function DecisionBlock({ result }: { result: StrategicContentResult }) {
  const d = result.decision;
  const verdict = d.verdict;
  const verdictMeta =
    verdict === "postar"
      ? { color: "border-success/40 bg-success/5 text-success", icon: CheckCircle2, label: "POSTAR" }
      : verdict === "refazer"
        ? { color: "border-warning/40 bg-warning/5 text-warning", icon: AlertTriangle, label: "REFAZER" }
        : { color: "border-destructive/40 bg-destructive/5 text-destructive", icon: XCircle, label: "DESCARTAR" };
  const Icon = verdictMeta.icon;
  const crits: (keyof typeof CRIT_LABEL)[] = [
    "generates_pain",
    "generates_identification",
    "creates_urgency",
  ];

  return (
    <div className={`rounded-md border p-3 ${verdictMeta.color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="font-display font-semibold">Decisão: {verdictMeta.label}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          score {result.score}/3
        </Badge>
      </div>
      <p className="text-xs mb-2 opacity-90">{d.verdict_reason}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        {crits.map((k) => {
          const c = (d as any)[k] as { value: boolean; reason: string };
          return (
            <div
              key={k}
              className="rounded-md bg-background/70 border border-border/40 p-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                {c?.value ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                {CRIT_LABEL[k]}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                {c?.reason}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
