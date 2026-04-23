import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnalysisResult,
  useDeleteAnalysis,
  useSessionAnalyses,
} from "@/hooks/useSessionAnalyses";
import { AnalysisSections } from "./SessionAnalysisDrawer";
import { Brain, Trash2, ChevronLeft } from "lucide-react";

const DEPTH_LABEL: Record<string, string> = {
  rapido: "Rápido",
  estrategico: "Estratégico",
  profundo: "Profundo",
};

export function SessionAnalysisHistory({ patientId }: { patientId: string }) {
  const { data: list = [] } = useSessionAnalyses(patientId);
  const del = useDeleteAnalysis();
  const [openId, setOpenId] = useState<string | null>(null);

  const opened = (list as any[]).find((a) => a.id === openId);

  if (!list.length) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center">
        Nenhuma análise salva ainda.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {(list as any[]).map((a) => (
          <button
            key={a.id}
            onClick={() => setOpenId(a.id)}
            className="w-full text-left rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">
                {a.kind === "comparative" ? "Comparativa" : "Sessão única"}
                {a.session_ids?.length ? ` · ${a.session_ids.length} sessões` : ""}
              </span>
              <Badge variant="outline" className="text-[9px]">
                {DEPTH_LABEL[a.depth] || a.depth}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(a.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
          {opened && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenId(null)}
                    className="-ml-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <SheetTitle className="font-display text-xl flex-1">
                    {opened.kind === "comparative" ? "Análise comparativa" : "Análise da sessão"}
                  </SheetTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Remover esta análise?")) return;
                      await del.mutateAsync(opened.id);
                      setOpenId(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {new Date(opened.created_at).toLocaleString("pt-BR")}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {DEPTH_LABEL[opened.depth] || opened.depth}
                  </Badge>
                </div>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                <AnalysisSections sections={(opened.result as AnalysisResult).sections || []} />

                <Card className="p-3 border-border/60 shadow-none mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Transcrição usada
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {opened.transcript}
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
