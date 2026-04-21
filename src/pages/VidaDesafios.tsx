import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useChallenges, useChallengeLogs, useUpsertChallenge, useToggleChallengeLog } from "@/hooks/useVida";
import { todayISO, addDaysISO } from "@/lib/format";
import { Plus, Trophy, X } from "lucide-react";

export default function VidaDesafios() {
  const { data: challenges = [] } = useChallenges();
  const upsert = useUpsertChallenge();
  const [editing, setEditing] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const save = () => {
    if (!editing.name?.trim()) return;
    upsert.mutate(editing);
    setEditing(null);
  };

  return (
    <AppLayout
      title="Desafios"
      subtitle="Consistência por uma duração definida"
      action={<Button size="sm" onClick={() => setEditing({ name: "", duration_days: 30, start_date: todayISO(), status: "ativo" })}><Plus className="h-4 w-4 mr-1" />Novo</Button>}
    >
      <VidaNav />

      {editing && (
        <Card className="p-5 mb-6 border-accent/40">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">Novo desafio</h3>
            <button onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
          </div>
          <Input placeholder="Nome do desafio" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mb-2" />
          <Input placeholder="Ação diária" value={editing.daily_action || ""} onChange={(e) => setEditing({ ...editing, daily_action: e.target.value })} className="mb-2" />
          <Textarea placeholder="Por que esse desafio importa" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="mb-2" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Input type="number" placeholder="Dias" value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: parseInt(e.target.value) || 30 })} />
            <Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
          </div>
          <Input placeholder="Recompensa ao concluir (opcional)" value={editing.reward || ""} onChange={(e) => setEditing({ ...editing, reward: e.target.value })} />
          <div className="flex gap-2 mt-3"><Button size="sm" onClick={save}>Iniciar</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button></div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        {challenges.map((c: any) => (
          <ChallengeCard key={c.id} challenge={c} expanded={selectedId === c.id} onToggle={() => setSelectedId(selectedId === c.id ? null : c.id)} />
        ))}
      </div>

      {challenges.length === 0 && !editing && (
        <p className="text-sm text-muted-foreground text-center py-12">Comece um desafio de 30 dias para criar consistência.</p>
      )}
    </AppLayout>
  );
}

function ChallengeCard({ challenge, expanded, onToggle }: any) {
  const { data: logs = [] } = useChallengeLogs(expanded ? challenge.id : undefined);
  const toggle = useToggleChallengeLog();

  const done = logs.length;
  const progress = Math.min(100, (done / challenge.duration_days) * 100);
  const today = todayISO();
  const days = Array.from({ length: challenge.duration_days }, (_, i) => addDaysISO(challenge.start_date, i));

  return (
    <Card className="p-4 border-border/60">
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" />{challenge.name}</h3>
            {challenge.daily_action && <p className="text-xs text-muted-foreground mt-0.5">{challenge.daily_action}</p>}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{done}/{challenge.duration_days}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </button>
      {expanded && (
        <div className="mt-4">
          <div className="grid grid-cols-10 gap-1">
            {days.map((d) => {
              const has = logs.find((l: any) => l.date === d);
              const isPast = d <= today;
              return (
                <button
                  key={d}
                  disabled={!isPast}
                  onClick={() => toggle.mutate({ challenge_id: challenge.id, date: d })}
                  title={d}
                  className={`aspect-square rounded text-[10px] font-medium ${has ? "bg-accent text-accent-foreground" : isPast ? "bg-muted hover:bg-muted/70" : "bg-muted/30 cursor-not-allowed"}`}
                >
                  {new Date(d + "T12:00").getDate()}
                </button>
              );
            })}
          </div>
          {challenge.reward && <p className="text-xs text-muted-foreground mt-3">🎁 {challenge.reward}</p>}
        </div>
      )}
    </Card>
  );
}
