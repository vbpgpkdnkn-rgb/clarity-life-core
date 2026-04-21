import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, X } from "lucide-react";
import { useUpsertTask } from "@/hooks/useData";

const POMODORO_SECONDS = 25 * 60;

export type FocusTask = { task_id: string; title: string; reason?: string };

export function FocusSessionDialog({
  open,
  onOpenChange,
  tasks,
  fullTasks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: FocusTask[];
  fullTasks: any[];
}) {
  const [idx, setIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(POMODORO_SECONDS);
  const [running, setRunning] = useState(false);
  const upsertTask = useUpsertTask();
  const intervalRef = useRef<number | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setIdx(0);
      setSecLeft(POMODORO_SECONDS);
      setRunning(true);
    } else {
      setRunning(false);
    }
  }, [open]);

  // Timer
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const current = tasks[idx];
  const next = tasks[idx + 1];
  const fullCurrent = fullTasks.find((t) => t.id === current?.task_id);
  const total = tasks.length;
  const elapsedPct = ((POMODORO_SECONDS - secLeft) / POMODORO_SECONDS) * 100;

  const advance = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setSecLeft(POMODORO_SECONDS);
      setRunning(true);
    } else {
      onOpenChange(false);
    }
  };

  const completeAndAdvance = () => {
    if (fullCurrent && fullCurrent.status !== "concluida") {
      upsertTask.mutate({
        ...fullCurrent,
        status: "concluida",
        completed_at: new Date().toISOString(),
      });
    }
    advance();
  };

  if (!current) return null;

  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen sm:rounded-none border-0 p-0 bg-background">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Tarefa {idx + 1} de {total}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-semibold mb-3 leading-tight">{current.title}</h1>
          {current.reason && (
            <p className="text-sm sm:text-base text-muted-foreground mb-10 max-w-md">{current.reason}</p>
          )}

          {/* Timer */}
          <div className="font-display text-7xl sm:text-8xl font-semibold tabular-nums mb-4">
            {mm}:{ss}
          </div>
          <Progress value={elapsedPct} className="h-1.5 w-full max-w-xs mb-8" />

          {/* Controls */}
          <div className="flex items-center gap-3 mb-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSecLeft(POMODORO_SECONDS);
                setRunning(false);
              }}
              title="Reiniciar timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="lg" onClick={() => setRunning((r) => !r)} className="min-w-32">
              {running ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              {running ? "Pausar" : "Retomar"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={advance}
              disabled={idx >= total - 1}
              title="Pular tarefa"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="default" size="lg" onClick={completeAndAdvance} className="bg-success hover:bg-success/90 text-success-foreground">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {idx < total - 1 ? "Concluir e avançar" : "Concluir e finalizar"}
          </Button>

          {next && (
            <div className="mt-12 text-xs text-muted-foreground">
              Próxima: <span className="text-foreground font-medium">{next.title}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
