import * as React from "react";

import { cn } from "@/lib/utils";
import { MicButton } from "@/components/MicButton";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, ...props }, ref) => {
    const showMic = (!type || type === "text" || type === "search") && typeof value === "string" && !!onChange;
    const input = (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          showMic && "pr-11",
          className,
        )}
        ref={ref}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
    if (!showMic) return input;
    return (
      <div className="relative w-full">
        {input}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <MicButton
            value={value}
            onChange={(next) => onChange?.({ target: { value: next }, currentTarget: { value: next } } as React.ChangeEvent<HTMLInputElement>)}
            size="sm"
          />
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
