import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, formatDateLong, addDaysISO } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDailyCheckin, useUpsertCheckin } from "@/hooks/useReflection";

const MOODS = [
  { v: "muito_baixo", label: "😞" },
  { v: "baixo", label: "😕" },
  { v: "neutro", label: "😐" },
  { v: "alto", label: "🙂" },
  { v: "muito_alto", label: "😄" },
];

function MoodPicker({ value, onChange, label }: any) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex gap-1">
        {MOODS.map((m) => (
          <button
            key={m.v}
            onClick={() => onChange(m.v)}
            className={`flex-1 py-2 rounded text-lg transition-all ${value === m.v ? "bg-accent/20 ring-1 ring-accent" : "bg-muted hover:bg-muted/70"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VidaCheckin() {
  const [date, setDate] = useState(todayISO());
  const { data: c } = useDailyCheckin(date);
  const upsert = useUpsertCheckin();

  const [mood, setMood] = useState("neutro");
  const [energy, setEnergy] = useState("neutro");
  const [stress, setStress] = useState("neutro");
  const [sleep, setSleep] = useState<string>("");
  const [wins, setWins] = useState(["", "", ""]);
  const [struggles, setStruggles] = useState(["", "", ""]);
  const [noticed, setNoticed] = useState("");
  const [rating, setRating] = useState<number>(3);
  const [tomorrow, setTomorrow] = useState("");

  useEffect(() => {
    if (c) {
      setMood(c.mood); setEnergy(c.energy); setStress(c.stress);
      setSleep(c.sleep_hours?.toString() ?? "");
      const w = (c.what_went_well as string[]) || [];
      const s = (c.what_struggled as string[]) || [];
      setWins([w[0] || "", w[1] || "", w[2] || ""]);
      setStruggles([s[0] || "", s[1] || "", s[2] || ""]);
      setNoticed(c.noticed || "");
      setRating(c.day_rating || 3);
      setTomorrow(c.for_tomorrow || "");
    } else {
      setMood("neutro"); setEnergy("neutro"); setStress("neutro"); setSleep("");
      setWins(["","",""]); setStruggles(["","",""]); setNoticed(""); setRating(3); setTomorrow("");
    }
  }, [c, date]);

  const save = () => upsert.mutate({
    date, mood, energy, stress,
    sleep_hours: sleep ? parseFloat(sleep) : null,
    what_went_well: wins.filter(Boolean),
    what_struggled: struggles.filter(Boolean),
    noticed, day_rating: rating, for_tomorrow: tomorrow,
  });

  return (
    <AppLayout
      title="Check-in emocional"
      subtitle={formatDateLong(date)}
      action={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(addDaysISO(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <VidaNav />

      <Card className="p-5 mb-6 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-4">Como você está agora?</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <MoodPicker label="Humor" value={mood} onChange={(v: string) => { setMood(v); setTimeout(save, 0); }} />
          <MoodPicker label="Energia" value={energy} onChange={(v: string) => { setEnergy(v); setTimeout(save, 0); }} />
          <MoodPicker label="Estresse" value={stress} onChange={(v: string) => { setStress(v); setTimeout(save, 0); }} />
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1">Horas de sono</p>
          <Input type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} onBlur={save} className="max-w-32" />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 border-border/60">
          <h2 className="font-display text-lg font-semibold mb-3">O que foi bem</h2>
          {wins.map((v, i) => (
            <Input key={i} value={v} onChange={(e) => { const n = [...wins]; n[i] = e.target.value; setWins(n); }} onBlur={save} placeholder={`Vitória ${i + 1}`} className="border-0 border-b border-border rounded-none focus-visible:ring-0 mb-1" />
          ))}
        </Card>
        <Card className="p-5 border-border/60">
          <h2 className="font-display text-lg font-semibold mb-3">O que foi difícil</h2>
          {struggles.map((v, i) => (
            <Input key={i} value={v} onChange={(e) => { const n = [...struggles]; n[i] = e.target.value; setStruggles(n); }} onBlur={save} placeholder={`Dificuldade ${i + 1}`} className="border-0 border-b border-border rounded-none focus-visible:ring-0 mb-1" />
          ))}
        </Card>
      </div>

      <Card className="p-5 mb-6 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">O que notei</h2>
        <Textarea value={noticed} onChange={(e) => setNoticed(e.target.value)} onBlur={save} placeholder="Padrões, pensamentos, reações..." rows={2} />
      </Card>

      <Card className="p-5 mb-6 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">Nota do dia</h2>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => { setRating(n); setTimeout(save, 0); }} className={`flex-1 py-3 rounded font-display text-2xl ${rating === n ? "bg-accent text-accent-foreground" : "bg-muted hover:bg-muted/70"}`}>{n}</button>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">Para amanhã</h2>
        <Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} onBlur={save} placeholder="Uma intenção para amanhã..." rows={2} />
      </Card>
    </AppLayout>
  );
}
