import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-card hover:-translate-y-[1px] hover:brightness-105 active:translate-y-0",
        secondary: "border border-white/70 bg-secondary/85 text-secondary-foreground hover:-translate-y-[1px] hover:bg-secondary active:translate-y-0",
        ghost: "bg-transparent text-foreground hover:bg-secondary/70 active:bg-secondary/80",
        outline: "border border-border bg-white/92 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:-translate-y-[1px] hover:bg-secondary/60 active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-card hover:-translate-y-[1px] hover:brightness-95 active:translate-y-0"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-[13px]",
        lg: "h-11 px-5",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
