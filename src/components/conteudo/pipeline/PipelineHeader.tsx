import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS, type ContentProject } from "@/hooks/useContentProject";

export const PipelineHeader = memo(function PipelineHeader({ project, onBack }: { project: ContentProject; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack}>← Voltar à lista</Button>
        <h2 className="text-lg font-semibold">{project.title}</h2>
      </div>
      <Badge variant="outline">
        Estágio atual: {project.current_stage} · {STAGE_LABELS[project.current_stage - 1] ?? "—"}
      </Badge>
    </div>
  );
});
