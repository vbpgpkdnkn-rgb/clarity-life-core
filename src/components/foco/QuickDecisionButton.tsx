import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Target, AlertTriangle, Zap, RefreshCw, Eye, GitBranch, HelpCircle, ListOrdered } from "lucide-react";
import { useQuickDecision } from "@/hooks/useStrategicAI";
import { toast } from "sonner";

export function QuickDecisionButton() {
  const [open, setOpen] = useState(false);
  const decision = useQuickDecision();

  const handleOpen = async () => {
    setOpen(true);
    if (!decision.data) {
      try {
        await decision.mutateAsync();
      } catch (e: any) {
        toast.error(e.message ?? "Falha ao consultar IA");
      }
    }
  };

  const refresh = async () => {
    try {
      await decision.mutateAsync();
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    }
  };

  const d = decision.data;

  return (
    <>
      <Button
        onClick={handleOpen}
        size="lg"
        className="fixed bottom-6 right-6 z-40 shadow-elevated rounded-full h-14 w-14 p-0 sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:rounded-full"
        title="O que devo fazer agora?"
      >
        <Brain className="h-5 w-5 sm:mr-2" />
        <span className="hidden sm:inline font-medium">O que fazer agora?</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Direcionamento do chefe
            </DialogTitle>
          </DialogHeader>

          {decision.isPending && (
            <div className="py-10 text-center text-sm text-muted-foreground">Analisando contexto…</div>
          )}

          {decision.isError && !decision.isPending && (
            <div className="py-6 text-sm text-destructive text-center">
              {(decision.error as any)?.message ?? "Erro"}
            </div>
          )}

          {d && !decision.isPending && (
            <div className="space-y-3 pt-2">
              <DecisionItem
                icon={<Target className="h-4 w-4" />}
                label="Prioridade agora"
                text={d.priority}
                tone="primary"
              />
              <DecisionItem
                icon={<Zap className="h-4 w-4" />}
                label="Próximos 30 minutos"
                text={d.immediate_action}
                tone="success"
              />
              {d.sequence?.length > 0 && (
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold mb-2">
                    <ListOrdered className="h-4 w-4" />
                    Sequência depois disso
                  </div>
                  <ol className="space-y-1.5 text-sm">
                    {d.sequence.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-display text-muted-foreground tabular-nums">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <DecisionItem
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Erro a corrigir"
                text={d.mistake_to_fix}
                tone="warning"
              />
              <DecisionItem
                icon={<Eye className="h-4 w-4" />}
                label="Ponto cego"
                text={d.blind_spot}
                tone="warning"
              />
              <DecisionItem
                icon={<GitBranch className="h-4 w-4" />}
                label="Decisão crítica de hoje"
                text={d.critical_decision}
                tone="primary"
              />
              <div className="p-3 rounded-lg border border-accent/40 bg-accent/10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold mb-1.5 text-accent">
                  <HelpCircle className="h-4 w-4" />
                  Pergunta do chefe
                </div>
                <p className="text-sm font-medium italic leading-relaxed">"{d.boss_question}"</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={decision.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${decision.isPending ? "animate-spin" : ""}`} />
              Reanalisar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DecisionItem({
  icon,
  label,
  text,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  tone: "primary" | "warning" | "success";
}) {
  const accent = {
    primary: "text-accent border-accent/30 bg-accent/5",
    warning: "text-warning border-warning/30 bg-warning/5",
    success: "text-success border-success/30 bg-success/5",
  }[tone];
  return (
    <div className={`p-3 rounded-lg border ${accent}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold mb-1.5">
        {icon}
        {label}
      </div>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}
