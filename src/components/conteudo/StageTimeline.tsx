import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/hooks/useContentProject";

interface Props {
  currentStage: number;
  doneStages?: number[];
  onStageClick?: (stage: number) => void;
}

export function StageTimeline({ currentStage, doneStages = [], onStageClick }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-center gap-1 min-w-max px-1 py-2">
        {STAGE_LABELS.map((label, i) => {
          const stage = i + 1;
          const isDone = doneStages.includes(stage) || stage < currentStage;
          const isActive = stage === currentStage;
          return (
            <li key={stage} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStageClick?.(stage)}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  isActive && "bg-primary/10",
                  !isActive && "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold border",
                    isDone && "bg-primary text-primary-foreground border-primary",
                    isActive && !isDone && "bg-background text-primary border-primary",
                    !isDone && !isActive && "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : stage}
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide whitespace-nowrap",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STAGE_LABELS.length - 1 && (
                <span
                  className={cn(
                    "h-px w-4",
                    stage < currentStage ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
