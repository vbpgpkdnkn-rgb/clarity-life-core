import { Mic, MicOff } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface MicButtonProps {
  /** Valor atual do campo */
  value: string;
  /** Recebe o novo valor (texto existente + ditado anexado) */
  onChange: (value: string) => void;
  /** Modo de combinação: 'append' adiciona ao final, 'replace' substitui */
  mode?: "append" | "replace";
  /** Tamanho do botão */
  size?: "sm" | "md";
  /** Mostrar prévia do texto interim */
  showInterim?: boolean;
  className?: string;
  /** Idioma — padrão pt-BR */
  lang?: string;
  /** Tooltip customizado */
  title?: string;
}

/**
 * Botão universal de microfone para qualquer campo de texto.
 * Anexa o texto ditado ao valor existente — pode ser usado em Input ou Textarea.
 */
export function MicButton({
  value,
  onChange,
  mode = "append",
  size = "sm",
  showInterim = false,
  className,
  lang = "pt-BR",
  title = "Ditar por voz",
}: MicButtonProps) {
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const { listening, interim, error, supported, toggle } = useDictation({
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
        onClick={toggle}
        title={title}
        aria-label={title}
        aria-pressed={listening}
        className={cn(
          "inline-flex items-center justify-center rounded-md border transition-all shrink-0",
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
