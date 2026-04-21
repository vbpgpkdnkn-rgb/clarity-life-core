import { cn } from "@/lib/utils";

export function ScopeBadge({ scope, className }: { scope: "pessoal" | "profissional"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
        scope === "pessoal"
          ? "bg-pessoal-soft text-pessoal border border-pessoal"
          : "bg-profissional-soft text-profissional border border-profissional",
        className,
      )}
    >
      {scope}
    </span>
  );
}
