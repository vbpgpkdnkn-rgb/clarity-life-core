import * as React from "react";
import { cn } from "@/lib/utils";
import { MicButton } from "@/components/MicButton";

interface InputWithMicProps extends React.ComponentProps<"input"> {
  value: string;
  onValueChange: (v: string) => void;
  micLang?: string;
  containerClassName?: string;
}

/**
 * Input com botão de microfone integrado à direita.
 * Use em qualquer lugar que aceite texto livre.
 */
export const InputWithMic = React.forwardRef<HTMLInputElement, InputWithMicProps>(
  ({ className, containerClassName, value, onValueChange, micLang, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center gap-2", containerClassName)}>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-11 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          {...props}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <MicButton value={value} onChange={onValueChange} lang={micLang} size="sm" />
        </div>
      </div>
    );
  },
);
InputWithMic.displayName = "InputWithMic";
