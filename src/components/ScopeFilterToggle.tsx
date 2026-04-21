import { useScope, type ScopeFilter } from "@/contexts/ScopeContext";
import { Heart, Briefcase, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScopeFilterToggle({ className }: { className?: string }) {
  const { scope, setScope } = useScope();
  const opts: { value: ScopeFilter; label: string; icon: any; activeCls: string }[] = [
    { value: "todos", label: "Tudo", icon: Layers, activeCls: "bg-primary text-primary-foreground" },
    { value: "pessoal", label: "Pessoal", icon: Heart, activeCls: "bg-pessoal text-primary-foreground" },
    { value: "profissional", label: "Profissional", icon: Briefcase, activeCls: "bg-profissional text-primary-foreground" },
  ];
  return (
    <div className={cn("inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-soft", className)}>
      {opts.map((o) => {
        const active = scope === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => setScope(o.value)}
            className={cn(
              "px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
              active ? o.activeCls : "text-muted-foreground hover:text-foreground",
            )}
            title={o.label}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
