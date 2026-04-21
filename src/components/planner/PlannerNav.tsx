import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/planner", label: "Diário", end: true },
  { to: "/planner/semanal", label: "Semanal" },
  { to: "/planner/revisao", label: "Revisão" },
  { to: "/planner/habitos", label: "Hábitos" },
  { to: "/planner/notas", label: "Notas" },
];

export function PlannerNav() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto -mx-1 px-1">
      {tabs.map((t) => {
        const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              active
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </NavLink>
        );
      })}
    </div>
  );
}
