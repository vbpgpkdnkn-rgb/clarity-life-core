import * as React from "react";

import { cn } from "@/lib/utils";
import { MicButton } from "@/components/MicButton";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, value, onChange, ...props }, ref) => {
  const showMic = typeof value === "string" && !!onChange;
  const textarea = (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        showMic && "pr-11",
        className,
      )}
      ref={ref}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
  if (!showMic) return textarea;
  return (
    <div className="relative w-full">
      {textarea}
      <div className="absolute right-1.5 top-1.5">
        <MicButton
          value={value}
          onChange={(next) => onChange?.({ target: { value: next }, currentTarget: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>)}
          size="sm"
        />
      </div>
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
