import { Card } from "@/components/ui/card";
import { Pin, X, Lightbulb, Quote, FileText, BookOpen, Clapperboard, Target, ListTodo, Sparkles } from "lucide-react";
import { useFocusPins, useRemovePin } from "@/hooks/useFocusPins";
import { useNavigate } from "react-router-dom";

const ICON_MAP: Record<string, any> = {
  insight: Lightbulb,
  quote: Quote,
  summary: FileText,
  book: BookOpen,
  content: Clapperboard,
  goal: Target,
  task: ListTodo,
  default: Sparkles,
};

export function PinnedItemsCard() {
  const { data: pins = [] } = useFocusPins();
  const remove = useRemovePin();
  const navigate = useNavigate();

  if (pins.length === 0) return null;

  return (
    <Card className="p-5 mb-6 border-accent/30 bg-accent/5 shadow-none">
      <div className="flex items-center gap-2 mb-3">
        <Pin className="h-4 w-4 text-accent" />
        <h3 className="font-display text-base font-semibold">Fixados no foco</h3>
        <span className="text-xs text-muted-foreground">({pins.length})</span>
      </div>
      <ul className="space-y-2">
        {pins.map((p) => {
          const Icon = ICON_MAP[p.icon || "default"] || ICON_MAP.default;
          return (
            <li
              key={p.id}
              className="group flex items-start gap-3 p-2.5 rounded-md bg-background border border-border/40 hover:border-accent/40 transition-colors"
            >
              <Icon className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <div
                className={`flex-1 min-w-0 ${p.link ? "cursor-pointer" : ""}`}
                onClick={() => p.link && navigate(p.link)}
              >
                <p className="text-sm font-medium leading-snug">{p.title}</p>
                {p.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => remove.mutate(p.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                title="Remover do foco"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
