import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VidaNav } from "@/components/vida/VidaNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, addDaysISO, formatDateLong } from "@/lib/format";
import { startOfWeekISO } from "@/lib/week";
import { useMealPlan, useUpsertMealPlan, useMealPlanRange } from "@/hooks/useVida";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLOTS = [
  { k: "breakfast", label: "Café" },
  { k: "lunch", label: "Almoço" },
  { k: "snack", label: "Lanche" },
  { k: "dinner", label: "Jantar" },
];

export default function VidaRefeicoes() {
  const [weekStart, setWeekStart] = useState(startOfWeekISO(todayISO()));
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const { data: weekPlans = [] } = useMealPlanRange(weekStart, addDaysISO(weekStart, 6));
  const upsert = useUpsertMealPlan();

  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [shopText, setShopText] = useState("");

  // Use the first day's shopping list as the week's shared list
  useEffect(() => {
    const first = weekPlans.find((p: any) => p.date === weekStart);
    if (first) setShoppingList((first.shopping_list as string[]) || []);
    else setShoppingList([]);
  }, [weekPlans, weekStart]);

  const setMeal = (date: string, slot: string, value: string) => {
    const existing = weekPlans.find((p: any) => p.date === date) || { date };
    upsert.mutate({ ...existing, [slot]: value });
  };

  const addShopping = () => {
    if (!shopText.trim()) return;
    const next = [...shoppingList, shopText.trim()];
    setShoppingList(next);
    setShopText("");
    upsert.mutate({ date: weekStart, shopping_list: next });
  };

  const removeShopping = (i: number) => {
    const next = shoppingList.filter((_, idx) => idx !== i);
    setShoppingList(next);
    upsert.mutate({ date: weekStart, shopping_list: next });
  };

  return (
    <AppLayout
      title="Refeições"
      subtitle={`Semana de ${formatDateLong(weekStart)}`}
      action={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeekISO(todayISO()))}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      }
    >
      <VidaNav />

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <Card className="p-4 border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 text-xs text-muted-foreground font-normal w-20">Dia</th>
                {SLOTS.map((s) => (
                  <th key={s.k} className="text-left py-2 px-2 text-xs text-muted-foreground font-normal">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const plan = weekPlans.find((p: any) => p.date === d) || {};
                return (
                  <tr key={d} className="border-b border-border/40">
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</td>
                    {SLOTS.map((s) => (
                      <td key={s.k} className="py-1 px-1">
                        <Input
                          defaultValue={plan[s.k] || ""}
                          onBlur={(e) => setMeal(d, s.k, e.target.value)}
                          placeholder="—"
                          className="h-8 text-sm border-0 focus-visible:ring-1"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card className="p-4 border-border/60">
          <h3 className="font-medium mb-3">Lista de compras</h3>
          <div className="flex gap-1 mb-3">
            <Input value={shopText} onChange={(e) => setShopText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addShopping()} placeholder="Item" className="h-8" />
            <Button size="sm" onClick={addShopping}>+</Button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {shoppingList.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 group">
                <span>{item}</span>
                <button onClick={() => removeShopping(i)} className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive">×</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
