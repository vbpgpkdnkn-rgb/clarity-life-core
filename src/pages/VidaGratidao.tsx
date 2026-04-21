import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, formatDateLong, addDaysISO } from "@/lib/format";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useGratitude, useUpsertGratitude, useGratitudeRange } from "@/hooks/useReflection";

export default function VidaGratidao() {
  const [date, setDate] = useState(todayISO());
  const { data: entry } = useGratitude(date);
  const upsert = useUpsertGratitude();
  const from = addDaysISO(todayISO(), -29);
  const { data: history = [] } = useGratitudeRange(from, todayISO());

  const [items, setItems] = useState(["", "", ""]);
  const [tinyJoys, setTinyJoys] = useState(["", "", ""]);
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (entry) {
      const it = (entry.items as string[]) || [];
      const tj = (entry.tiny_joys as string[]) || [];
      setItems([it[0] || "", it[1] || "", it[2] || ""]);
      setTinyJoys([tj[0] || "", tj[1] || "", tj[2] || ""]);
      setReflection(entry.reflection || "");
    } else {
      setItems(["", "", ""]); setTinyJoys(["", "", ""]); setReflection("");
    }
  }, [entry, date]);

  const save = () => upsert.mutate({ date, items: items.filter(Boolean), tiny_joys: tinyJoys.filter(Boolean), reflection });

  return (
    <AppLayout
      title="Gratidão"
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
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent" /> 3 gratidões de hoje
        </h2>
        <div className="space-y-2">
          {items.map((v, i) => (
            <Input key={i} value={v} onChange={(e) => { const n = [...items]; n[i] = e.target.value; setItems(n); }} onBlur={save} placeholder={`Sou grato(a) por...`} className="border-0 border-b border-border rounded-none focus-visible:ring-0" />
          ))}
        </div>
      </Card>

      <Card className="p-5 mb-6 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">Pequenas alegrias</h2>
        <div className="space-y-2">
          {tinyJoys.map((v, i) => (
            <Input key={i} value={v} onChange={(e) => { const n = [...tinyJoys]; n[i] = e.target.value; setTinyJoys(n); }} onBlur={save} placeholder="Um momento de calma..." className="border-0 border-b border-border rounded-none focus-visible:ring-0" />
          ))}
        </div>
      </Card>

      <Card className="p-5 mb-6 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">Reflexão</h2>
        <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} onBlur={save} placeholder="Por que essas coisas importam..." rows={3} />
      </Card>

      <Card className="p-5 border-border/60">
        <h2 className="font-display text-lg font-semibold mb-3">Histórico (30 dias)</h2>
        <div className="grid grid-cols-15 gap-1 sm:grid-cols-30">
          {Array.from({ length: 30 }).map((_, i) => {
            const d = addDaysISO(todayISO(), -29 + i);
            const has = history.find((h: any) => h.date === d);
            return <div key={d} title={d} className={`aspect-square rounded ${has ? "bg-accent" : "bg-muted"}`} />;
          })}
        </div>
      </Card>
    </AppLayout>
  );
}
