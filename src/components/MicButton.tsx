import { Mic, MicOff } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface MicButtonProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "append" | "replace";
  size?: "sm" | "md";
  showInterim?: boolean;
  className?: string;
  lang?: string;
  title?: string;
}

export function MicButton({
  value,
  onChange,
  mode = "append",
  size = "sm",
  showInterim = false,
  className,
  lang = "pt-BR",
  title = "Segure para falar",
}: MicButtonProps) {
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const { listening, interim, error, supported, start, stop } = useDictation({
    lang,
    continuous: true,
    onFinal: (text) => {
      const current = valueRef.current ?? "";
      if (mode === "replace") {
        onChange(text);
      } else {
        const sep = current && !current.endsWith(" ") && !current.endsWith("\n") ? " " : "";
        onChange(current + sep + text);
      }
    },
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (!supported) return null;

  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); start(); }}
        onPointerUp={(e) => { e.preventDefault(); stop(); }}
        onPointerLeave={(e) => { if (listening) { e.preventDefault(); stop(); } }}
        title={title}
        aria-label={title}
        aria-pressed={listening}
        className={cn(
          "inline-flex items-center justify-center rounded-md border transition-all shrink-0 select-none touch-none",
          dim,
          listening
            ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
          className,
        )}
      >
        {listening ? <MicOff className={icon} /> : <Mic className={icon} />}
      </button>
      {showInterim && listening && interim && (
        <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
          {interim}…
        </div>
      )}
    </>
  );
}
