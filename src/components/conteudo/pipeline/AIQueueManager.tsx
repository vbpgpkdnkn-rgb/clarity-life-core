import { memo } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { useContentProjectQueue } from "@/hooks/useContentProjectQueue";

type QueueState = ReturnType<typeof useContentProjectQueue>;

export const AIQueueManager = memo(function AIQueueManager({ queue }: { queue: QueueState }) {
  if (!queue.isBusy) return null;

  return (
    <Card className="p-2 border-primary/30 bg-primary/5 text-xs flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Operação serializada: {queue.activeOperation ?? "na fila"}
        {queue.pendingCount ? ` · ${queue.pendingCount} pendente(s)` : ""}
      </span>
      <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={queue.cancelPendingActions}>
        Cancelar fila
      </Button>
    </Card>
  );
});
