import { Pin, PinOff } from "lucide-react";
import { useIsPinned, useTogglePin } from "@/hooks/useFocusPins";
import { cn } from "@/lib/utils";

interface PinButtonProps {
  source_table: string;
  source_id: string;
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  link?: string | null;
  size?: "sm" | "md";
  variant?: "icon" | "button";
  className?: string;
}

export function PinButton({
  source_table,
  source_id,
  title,
  subtitle,
  icon,
  link,
  size = "sm",
  variant = "icon",
  className,
}: PinButtonProps) {
  const pinned = useIsPinned(source_table, source_id);
  const toggle = useTogglePin();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle.mutate({ source_table, source_id, title, subtitle, icon, link });
  };

  const Icon = pinned ? PinOff : Pin;
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (variant === "button") {
    return (
      <button
        onClick={handleClick}
        disabled={toggle.isPending}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
          pinned
            ? "bg-accent/15 text-accent hover:bg-accent/25"
            : "bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent",
          className,
        )}
        title={pinned ? "Remover do Foco do Dia" : "Fixar no Foco do Dia"}
      >
        <Icon className={iconSize} />
        {pinned ? "Fixado" : "Fixar no foco"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={toggle.isPending}
      className={cn(
        "p-1 rounded transition-colors",
        pinned
          ? "text-accent hover:bg-accent/10"
          : "text-muted-foreground hover:text-accent hover:bg-accent/10",
        className,
      )}
      title={pinned ? "Remover do Foco do Dia" : "Fixar no Foco do Dia"}
    >
      <Icon className={iconSize} />
    </button>
  );
}
