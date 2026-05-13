import { memo, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RecoveryControls = memo(function RecoveryControls({ projectId, onReset }: { projectId: string; onReset?: () => void }) {
  const hasSnapshot = useMemo(() => {
    try {
      return Boolean(sessionStorage.getItem(`content-pipeline:last-stable:${projectId}`));
    } catch {
      return false;
    }
  }, [projectId]);

  if (!hasSnapshot) return null;

  return (
    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onReset}>
      <RotateCcw className="h-3 w-3 mr-1" /> Restaurar visual seguro
    </Button>
  );
});
