import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";
import {
  Heart,
  BookOpen,
  Sparkles as SparklesIcon,
  Sparkle,
  Utensils,
  ShoppingBag,
  Award,
  ChevronRight,
  Smile,
  Brain,
  Image as ImageIcon,
} from "lucide-react";

const MOOD_EMOJI: Record<string, string> = {
  muito_baixo: "😞",
  baixo: "🙁",
  neutro: "😐",
  alto: "🙂",
  muito_alto: "😄",
};

/**
 * Card resumo da Vida no Foco do Dia.
 * Mostra check-in rápido + atalhos para sub-áreas (Livros, Faxina, etc.).
 */
export function VidaQuickCard() {
  const navigate = useNavigate();
  const today = todayISO();

  const checkinQ = useQuery({
    queryKey: ["daily_checkin", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("mood, energy, stress")
        .eq("date", today)
        .maybeSingle();
      return data;
    },
  });

  const c = checkinQ.data;

  const shortcuts = [
    { to: "/vida/livros", label: "Livros", icon: BookOpen },
    { to: "/vida/limpeza", label: "Faxina", icon: Sparkle },
    { to: "/vida/refeicoes", label: "Refeições", icon: Utensils },
    { to: "/vida/gratidao", label: "Gratidão", icon: Heart },
    { to: "/vida/desafios", label: "Desafios", icon: Award },
    { to: "/vida/dreamboard", label: "Dreamboard", icon: ImageIcon },
    { to: "/vida/brain-dump", label: "Brain dump", icon: Brain },
    { to: "/vida/desejos", label: "Desejos", icon: ShoppingBag },
  ];

  return (
    <Card className="p-5 border-border/60 shadow-none mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">Vida</h3>
          {c && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Smile className="h-2.5 w-2.5" />
              {MOOD_EMOJI[c.mood] ?? ""} {MOOD_EMOJI[c.energy] ?? ""}
            </Badge>
          )}
        </div>
        <button
          onClick={() => navigate("/vida")}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          Hub completo <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {!c && (
        <button
          onClick={() => navigate("/vida/checkin")}
          className="w-full mb-4 px-3 py-2.5 rounded-md border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-2"
        >
          <SparklesIcon className="h-3.5 w-3.5 text-accent" />
          Como você está se sentindo hoje? — fazer check-in rápido
        </button>
      )}

      <div className="grid grid-cols-4 gap-2">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.to}
              onClick={() => navigate(s.to)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-md border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors group"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
