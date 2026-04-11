import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "app-input native-input flex h-10 w-full rounded-xl px-3.5 py-2 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/90 hover:border-[rgba(201,168,111,0.22)] hover:bg-[rgba(255,255,255,0.045)] focus-visible:border-[rgba(214,190,142,0.38)] focus-visible:bg-[rgba(255,255,255,0.05)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--field-border)] disabled:hover:bg-[var(--field-bg)]",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
