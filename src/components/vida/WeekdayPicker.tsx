import { WEEKDAY_LABELS } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  className?: string;
}

/** Seletor compacto de dias da semana (0=Dom, 6=Sáb). */
export function WeekdayPicker({ value, onChange, className }: Props) {
  const toggle = (d: number) => {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else onChange([...value, d].sort());
  };
  return (
    <div className={cn("flex gap-1", className)}>
      {WEEKDAY_LABELS.map((label, i) => {
        const active = value.includes(i);
        return (
          <button
            type="button"
            key={i}
            onClick={() => toggle(i)}
            className={cn(
              "h-8 w-9 rounded-md text-xs font-medium border transition-colors",
              active
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background border-border text-muted-foreground hover:border-accent/50",
            )}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
