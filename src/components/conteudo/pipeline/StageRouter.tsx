import { lazy, memo, Suspense, useMemo, type ReactNode } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PipelineStageProps } from "./pipelineUtils";

const IdeaStage = lazy(() => import("./stages/PassiveStage").then((module) => ({ default: module.IdeaStage })));
const AudienceStage = lazy(() => import("./stages/PassiveStage").then((module) => ({ default: module.AudienceStage })));
const StrategyStage = lazy(() => import("./stages/PassiveStage").then((module) => ({ default: module.StrategyStage })));
const StructureStage = lazy(() => import("./stages/StructureStage").then((module) => ({ default: module.StructureStage })));
const TopicsStage = lazy(() => import("./stages/TopicsStage").then((module) => ({ default: module.TopicsStage })));
const ScriptStage = lazy(() => import("./stages/ScriptStage").then((module) => ({ default: module.ScriptStage })));
const ReviewStage = lazy(() => import("./stages/ReviewStage").then((module) => ({ default: module.ReviewStage })));
const ProductionStage = lazy(() => import("./stages/PassiveStage").then((module) => ({ default: module.ProductionStage })));

const ROUTES = [
  { value: 1, label: "Ideia", Component: IdeaStage },
  { value: 2, label: "Audiência", Component: AudienceStage },
  { value: 3, label: "Estratégia", Component: StrategyStage },
  { value: 4, label: "Estrutura", Component: StructureStage },
  { value: 5, label: "Tópicos", Component: TopicsStage },
  { value: 6, label: "Roteiro", Component: ScriptStage },
  { value: 7, label: "Revisão", Component: ReviewStage },
  { value: 8, label: "Produção", Component: ProductionStage },
];

export const StageRouter = memo(function StageRouter({
  activeStage,
  onStageChange,
  stageProps,
}: {
  activeStage: number;
  onStageChange: (stage: number) => void;
  stageProps: PipelineStageProps;
}) {
  const value = String(activeStage);
  const routes = useMemo(() => ROUTES, []);

  return (
    <Tabs value={value} onValueChange={(next) => onStageChange(Number(next))} className="space-y-3">
      <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto md:flex-wrap">
        {routes.map((route) => (
          <TabsTrigger key={route.value} value={String(route.value)} className="text-[11px]">
            {route.value}. {route.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {routes.map(({ value: routeValue, label, Component }) => (
        <TabsContent key={routeValue} value={String(routeValue)} className="space-y-3">
          <StageErrorBoundary stage={routeValue} label={label} projectId={stageProps.project.id}>
            <Suspense fallback={<StageLoading label={label} />}>
              <Component {...stageProps} />
            </Suspense>
          </StageErrorBoundary>
        </TabsContent>
      ))}
    </Tabs>
  );
});

function StageLoading({ label }: { label: string }) {
  return (
    <Card className="p-4 text-xs text-muted-foreground flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando {label.toLowerCase()}...
    </Card>
  );
}

function StageErrorBoundary({ children, stage, label, projectId }: { children: ReactNode; stage: number; label: string; projectId: string }) {
  return (
    <ErrorBoundary
      scope={`Esteira/${label}`}
      resetKey={`${projectId}:${stage}`}
      fallback={(error, reset) => (
        <Card className="p-4 border-destructive/40 bg-destructive/5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">{label} foi isolado para evitar tela branca</h3>
          </div>
          <p className="text-xs text-muted-foreground">Os outros estágios continuam funcionando e o estado salvo do projeto foi preservado.</p>
          <pre className="max-h-28 overflow-auto rounded border bg-background/70 p-2 text-[10px]">{error.message}</pre>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Tentar etapa novamente
            </Button>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
