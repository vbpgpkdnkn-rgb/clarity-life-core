import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/vida", label: "Hub", end: true },
  { to: "/vida/areas", label: "Áreas" },
  { to: "/vida/dreamboard", label: "Dreamboard" },
  { to: "/vida/gratidao", label: "Gratidão" },
  { to: "/vida/brain-dump", label: "Brain dump" },
  { to: "/vida/checkin", label: "Check-in" },
  { to: "/vida/refeicoes", label: "Refeições" },
  { to: "/vida/limpeza", label: "Limpeza" },
  { to: "/vida/desejos", label: "Desejos" },
  { to: "/vida/livros", label: "Livros" },
  { to: "/vida/desafios", label: "Desafios" },
];

export function VidaNav() {
  return (
    <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto -mx-1 px-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
