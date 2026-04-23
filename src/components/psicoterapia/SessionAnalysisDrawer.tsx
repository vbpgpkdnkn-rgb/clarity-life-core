import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AnalysisDepth,
  AnalysisKind,
  AnalysisResult,
  loadDraft,
  loadLastDepth,
  saveDraft,
  saveLastDepth,
  useGenerateAnalysis,
  useSaveAnalysis,
} from "@/hooks/useSessionAnalyses";
import { useTherapySessions } from "@/hooks/usePsicoterapia";
import {
  Brain,
  ChevronDown,
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

const LOADING_MESSAGES = [
  "Identificando padrões…",
  "Mapeando pontos de atenção…",
  "Estruturando direcionamento…",
  "Cruzando temas centrais…",
  "Refinando próximas ações…",
];

const DEPTH_OPTIONS: { value: AnalysisDepth; label: string; hint: string }[] = [
  { value: "rapido", label: "Rápido", hint: "Bullets enxutos" },
  { value: "estrategico", label: "Estratégico", hint: "Equilibrado" },
  { value: "profundo", label: "Profundo", hint: "Análise rica" },
];

const HIGHLIGHT_KEYS = new Set(["proxima", "direcionamento"]);

export function SessionAnalysisDrawer({
  open,
  onOpenChange,
  patientId,
  patientName,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
  patientName: string;
  kind: AnalysisKind;
}) {
  const [depth, setDepth] = useState<AnalysisDepth>("estrategico");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [inputMode, setInputMode] = useState<"paste" | "select">("paste");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessions = [] } = useTherapySessions({ patient_id: patientId });
  const generate = useGenerateAnalysis();
  const save = useSaveAnalysis();

  // Reset / restore on open
  useEffect(() => {
    if (open) {
      setResult(null);
      setDepth(loadLastDepth());
      setTranscript(loadDraft(patientId, kind));
      setSelectedIds([]);
      setInputMode("paste");
      // Foco no textarea
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, patientId, kind]);

  // Salva rascunho automaticamente
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => saveDraft(patientId, kind, transcript), 400);
    return () => clearTimeout(t);
  }, [transcript, open, patientId, kind]);

  // Loading rotativo
  useEffect(() => {
    if (!generate.isPending) return;
    setLoadingIdx(0);
    const id = setInterval(() => {
      setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [generate.isPending]);

  const realizadasOrdered = useMemo(() => {
    return (sessions as any[])
      .filter((s) => s.status === "realizada" || s.status === "agendada")
      .sort((a, b) => (b.date + (b.start_time || "")).localeCompare(a.date + (a.start_time || "")));
  }, [sessions]);

  const buildTranscriptFromSelection = () => {
    // Junta as notas internas das sessões selecionadas (não há campo de transcrição completa).
    // Caso a usuária não tenha colado nada lá, ela ainda assim pode editar o texto antes de gerar.
    const chosen = realizadasOrdered.filter((s: any) => selectedIds.includes(s.id));
    if (!chosen.length) return "";
    return chosen
      .map((s: any) => {
        const dt = new Date(s.date + "T00:00").toLocaleDateString("pt-BR");
        const note = s.internal_notes?.trim() || "(sem nota registrada para esta sessão)";
        return `### Sessão ${dt}${s.start_time ? " " + s.start_time.slice(0, 5) : ""}\n${note}`;
      })
      .join("\n\n");
  };

  const effectiveTranscript = useMemo(() => {
    if (kind === "comparative" && inputMode === "select") {
      return buildTranscriptFromSelection();
    }
    return transcript;
  }, [kind, inputMode, transcript, selectedIds, realizadasOrdered]);

  const canGenerate = effectiveTranscript.trim().length >= 30 && !generate.isPending;

  const doGenerate = async () => {
    if (!canGenerate) return;
    saveLastDepth(depth);
    try {
      const res = await generate.mutateAsync({
        mode: kind,
        depth,
        transcript: effectiveTranscript,
        patient_name: patientName,
      });
      setResult(res);
    } catch {
      // toast já tratado no hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      doGenerate();
    }
  };

  const doSave = async () => {
    if (!result) return;
    await save.mutateAsync({
      patient_id: patientId,
      kind,
      depth,
      transcript: effectiveTranscript,
      result,
      session_ids: kind === "comparative" && inputMode === "select" ? selectedIds : [],
    });
    // Limpa rascunho após salvar
    saveDraft(patientId, kind, "");
  };

  const doCopy = async () => {
    if (!result) return;
    const text = result.sections
      .map((s) => `${s.title.toUpperCase()}\n${s.bullets.map((b) => `• ${b}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Análise copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const newAnalysis = () => {
    setResult(null);
    setTranscript("");
    saveDraft(patientId, kind, "");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            {kind === "single" ? "Análise da sessão" : "Análise comparativa"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {patientName} · Não é prontuário, não é diagnóstico, não é laudo.
          </p>
        </SheetHeader>

        {/* INPUT */}
        {!result && (
          <div className="space-y-5 mt-6">
            <div>
              <Label className="mb-2 block">Profundidade</Label>
              <div className="grid grid-cols-3 gap-2">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDepth(opt.value)}
                    className={`text-left rounded-md border p-2.5 transition-colors ${
                      depth === opt.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {kind === "comparative" && (
              <div>
                <Label className="mb-2 block">Origem do conteúdo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`text-sm rounded-md border p-2 ${
                      inputMode === "paste"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    Colar transcrições
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("select")}
                    className={`text-sm rounded-md border p-2 ${
                      inputMode === "select"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    Selecionar sessões existentes
                  </button>
                </div>
              </div>
            )}

            {kind === "comparative" && inputMode === "select" ? (
              <div>
                <Label className="mb-2 block">
                  Selecione as sessões{" "}
                  <span className="text-[11px] text-muted-foreground">
                    (usa as notas internas de cada uma)
                  </span>
                </Label>
                {realizadasOrdered.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Nenhuma sessão registrada.</p>
                ) : (
                  <div className="border border-border rounded-md max-h-64 overflow-y-auto divide-y divide-border">
                    {realizadasOrdered.map((s: any) => {
                      const checked = selectedIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-start gap-2 p-2.5 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedIds((prev) =>
                                v ? [...prev, s.id] : prev.filter((x) => x !== s.id),
                              );
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">
                              {new Date(s.date + "T00:00").toLocaleDateString("pt-BR")}
                              {s.start_time && (
                                <span className="text-muted-foreground"> · {s.start_time.slice(0, 5)}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {s.internal_notes?.trim() || "Sem nota interna"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label className="mb-2 block">
                  {kind === "single" ? "Transcrição da sessão" : "Transcrições (separe por data ou título)"}
                </Label>
                <Textarea
                  ref={textareaRef}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    kind === "single"
                      ? "Cole a transcrição da sessão"
                      : "Cole as transcrições. Ex.: ### Sessão 12/04 ... ### Sessão 19/04 ..."
                  }
                  rows={14}
                  className="resize-y min-h-[260px]"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Atalho: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl/⌘ + Enter</kbd> para gerar
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {transcript.length} caracteres
                  </span>
                </div>
              </div>
            )}

            {generate.isPending && (
              <Card className="p-4 border-accent/30 bg-accent/5">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <div className="text-sm">{LOADING_MESSAGES[loadingIdx]}</div>
                </div>
              </Card>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={doGenerate} disabled={!canGenerate} className="flex-1">
                <Brain className="h-4 w-4 mr-1" />
                {kind === "single" ? "Gerar análise" : "Gerar análise comparativa"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div className="space-y-3 mt-6">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={doSave} disabled={save.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={doCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={doGenerate} disabled={generate.isPending}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refazer
              </Button>
              <Button size="sm" variant="ghost" onClick={newAnalysis}>
                Nova análise
              </Button>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {DEPTH_OPTIONS.find((d) => d.value === depth)?.label}
              </Badge>
            </div>

            <AnalysisSections sections={result.sections} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function AnalysisSections({ sections }: { sections: AnalysisResult["sections"] }) {
  return (
    <div className="space-y-2">
      {sections.map((sec, idx) => {
        const highlight = HIGHLIGHT_KEYS.has(sec.key);
        return (
          <Collapsible key={sec.key} defaultOpen={idx < 2 || highlight}>
            <Card
              className={`border-border/60 shadow-none ${
                highlight ? "border-accent/40 bg-accent/5" : ""
              }`}
            >
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between text-left group">
                <div className="flex items-center gap-2">
                  {highlight && <Star className="h-4 w-4 text-accent fill-accent" />}
                  <span className="font-display font-semibold text-sm">
                    {sec.title}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {sec.bullets.length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0">
                  {sec.bullets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sem itens.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {sec.bullets.map((b, i) => (
                        <li key={i} className="text-sm leading-relaxed flex gap-2">
                          <span className="text-accent mt-0.5">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
