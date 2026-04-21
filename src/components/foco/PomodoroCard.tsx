import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Coffee, Timer } from "lucide-react";
import { useStartFocusSession, useEndFocusSession, useFocusSessions } from "@/hooks/useFocusSessions";
import { useUpsertTask } from "@/hooks/useData";
import { toast } from "sonner";

type Mode = "focus" | "break";

export function PomodoroCard({ tasks }: { tasks: any[] }) {
  const [planned, setPlanned] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<Mode>("focus");
  const [secLeft, setSecLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>("none");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const start = useStartFocusSession();
  const end = useEndFocusSession();
  const upsertTask = useUpsertTask();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todaySessions = [] } = useFocusSessions(todayStart.toISOString());

  // Sync seconds when planned/breakMin/mode change while not running
  useEffect(() => {
    if (!running) {
      setSecLeft((mode === "focus" ? planned : breakMin) * 60);
    }
  }, [planned, breakMin, mode, running]);

  // Timer tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          // session complete
          window.clearInterval(intervalRef.current!);
          intervalRef.current = null;
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleStart = async () => {
    if (mode === "focus") {
      try {
        const data = await start.mutateAsync({
          task_id: taskId === "none" ? undefined : taskId,
          planned_minutes: planned,
          kind: "pomodoro",
        });
        setSessionId(data.id);
      } catch (e: any) {
        toast.error(e.message);
        return;
      }
    }
    setRunning(true);
  };

  const handleComplete = async () => {
    setRunning(false);
    if (mode === "focus" && sessionId) {
      await end.mutateAsync({
        id: sessionId,
        actual_minutes: planned,
        completed: true,
        interruptions: 0,
      });
      setSessionId(null);
      // Acumula minutos na tarefa
      if (taskId !== "none") {
        const t = tasks.find((x) => x.id === taskId);
        if (t) {
          upsertTask.mutate({
            ...t,
            execution_minutes: (t.execution_minutes ?? 0) + planned,
          });
        }
      }
      toast.success("Pomodoro concluído. Hora da pausa.");
      setMode("break");
      setSecLeft(breakMin * 60);
    } else {
      toast.success("Pausa terminada. Pronto pra próximo bloco.");
      setMode("focus");
      setSecLeft(planned * 60);
    }
  };

  const handleStop = async () => {
    if (running) {
      setRunning(false);
      if (mode === "focus" && sessionId) {
        const elapsed = planned * 60 - secLeft;
        await end.mutateAsync({
          id: sessionId,
          actual_minutes: Math.round(elapsed / 60),
          completed: false,
          interruptions: 1,
        });
        setSessionId(null);
        toast("Sessão interrompida e registrada.");
      }
    }
    setSecLeft((mode === "focus" ? planned : breakMin) * 60);
  };

  const totalSec = (mode === "focus" ? planned : breakMin) * 60;
  const pct = ((totalSec - secLeft) / totalSec) * 100;
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");

  const completedToday = todaySessions.filter((s: any) => s.completed && s.kind === "pomodoro").length;
  const minutesToday = todaySessions.reduce((sum: number, s: any) => sum + (s.actual_minutes ?? 0), 0);

  return (
    <Card className="p-5 border-border/60 shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {mode === "focus" ? (
            <Timer className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Coffee className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="font-display text-base font-semibold">
            {mode === "focus" ? "Pomodoro" : "Pausa"}
          </h3>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          hoje · {completedToday} sessões · {minutesToday} min
        </div>
      </div>

      {/* Setup */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Select value={String(planned)} onValueChange={(v) => setPlanned(Number(v))} disabled={running}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[15, 25, 45, 50, 90].map((m) => (
              <SelectItem key={m} value={String(m)}>{m} min foco</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(breakMin)} onValueChange={(v) => setBreakMin(Number(v))} disabled={running}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[5, 10, 15, 20].map((m) => (
              <SelectItem key={m} value={String(m)}>{m} min pausa</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={taskId} onValueChange={setTaskId} disabled={running}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tarefa…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem tarefa</SelectItem>
            {tasks
              .filter((t) => t.status !== "concluida")
              .slice(0, 30)
              .map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timer display */}
      <div className="text-center mb-4">
        <div className="font-display text-5xl sm:text-6xl font-semibold tabular-nums mb-2">
          {mm}:{ss}
        </div>
        <Progress value={pct} className="h-1 max-w-xs mx-auto" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={handleStop} title="Reiniciar / Parar">
          <RotateCcw className="h-4 w-4" />
        </Button>
        {!running ? (
          <Button onClick={handleStart} className="min-w-32">
            <Play className="h-4 w-4 mr-2" /> Iniciar
          </Button>
        ) : (
          <Button onClick={() => setRunning(false)} variant="secondary" className="min-w-32">
            <Pause className="h-4 w-4 mr-2" /> Pausar
          </Button>
        )}
      </div>
    </Card>
  );
}
