import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Smile,
  Battery,
  Bed,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";

type Mood = "muito_baixo" | "baixo" | "neutro" | "alto" | "muito_alto";

const MOODS: { v: Mood; label: string; emoji: string }[] = [
  { v: "muito_baixo", label: "Muito baixo", emoji: "😞" },
  { v: "baixo", label: "Baixo", emoji: "🙁" },
  { v: "neutro", label: "Neutro", emoji: "😐" },
  { v: "alto", label: "Alto", emoji: "🙂" },
  { v: "muito_alto", label: "Muito alto", emoji: "😄" },
];

export function LifeCheckCard() {
  const navigate = useNavigate();
  const today = todayISO();
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [mood, setMood] = useState<Mood>("neutro");
  const [energy, setEnergy] = useState<Mood>("neutro");
  const [stress, setStress] = useState<Mood>("neutro");
  const [sleep, setSleep] = useState<string>("");
  const [reflection, setReflection] = useState("");
  const [tomorrow, setTomorrow] = useState("");

  const existingQ = useQuery({
    queryKey: ["daily_checkin", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        date: today,
        mood,
        energy,
        stress,
        sleep_hours: sleep === "" ? null : Number(sleep),
        noticed: reflection || null,
        for_tomorrow: tomorrow || null,
      };
      if (existingQ.data?.id) {
        const { error } = await supabase
          .from("daily_checkins")
          .update(payload)
          .eq("id", existingQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_checkins").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_checkin", today] });
      toast.success("Check-in do dia registrado");
      setExpanded(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const done = !!existingQ.data;

  return (
    <Card className="p-5 border-border/60 shadow-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">
            Checklist Vida — fim do dia
          </h3>
          {done && (
            <Badge className="text-[10px] bg-success/15 text-success border-success/30">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> feito
            </Badge>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {expanded ? "fechar" : done ? "rever" : "abrir"}
          <ChevronRight
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {!expanded && (
        <p className="text-sm text-muted-foreground">
          Antes de fechar o dia, registre humor, energia e o que aprendeu. 1 minuto.
        </p>
      )}

      {expanded && (
        <div className="space-y-4">
          <MoodRow label="Humor" icon={<Smile className="h-3.5 w-3.5" />} value={mood} onChange={setMood} />
          <MoodRow label="Energia" icon={<Battery className="h-3.5 w-3.5" />} value={energy} onChange={setEnergy} />
          <MoodRow label="Estresse" icon={<Battery className="h-3.5 w-3.5 rotate-180" />} value={stress} onChange={setStress} />

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
              <Bed className="h-3 w-3" /> Horas de sono (esta noite passada)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="14"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="w-24 h-8 px-2 rounded-md border border-border bg-background text-sm"
              placeholder="7"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
              O que aprendeu / observou hoje?
            </label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Ex.: sou mais produtivo de manhã. Reuniões longas me drenam."
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
              1 ajuste para amanhã
            </label>
            <Textarea
              value={tomorrow}
              onChange={(e) => setTomorrow(e.target.value)}
              placeholder="Ex.: bloquear 9h-11h pra trabalho profundo"
              rows={2}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <button
              onClick={() => navigate("/vida/checkin")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Check-in completo →
            </button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function MoodRow({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: Mood;
  onChange: (m: Mood) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </div>
      <div className="flex gap-1">
        {MOODS.map((m) => (
          <button
            key={m.v}
            onClick={() => onChange(m.v)}
            className={`flex-1 py-1.5 rounded-md text-base transition-all ${
              value === m.v
                ? "bg-accent/15 ring-1 ring-accent/40"
                : "hover:bg-muted"
            }`}
            title={m.label}
          >
            {m.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
