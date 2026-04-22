import * as React from "react";
import { cn } from "@/lib/utils";
import { MicButton } from "@/components/MicButton";

interface TextareaWithMicProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (v: string) => void;
  micLang?: string;
  containerClassName?: string;
}

/**
 * Textarea com botão de microfone no canto superior direito.
 */
export const TextareaWithMic = React.forwardRef<HTMLTextAreaElement, TextareaWithMicProps>(
  ({ className, containerClassName, value, onValueChange, micLang, ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 pr-11 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <div className="absolute right-1.5 top-1.5">
          <MicButton value={value} onChange={onValueChange} lang={micLang} size="sm" />
        </div>
      </div>
    );
  },
);
TextareaWithMic.displayName = "TextareaWithMic";
