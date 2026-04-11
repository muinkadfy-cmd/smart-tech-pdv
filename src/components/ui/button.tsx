import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "app-button inline-flex items-center justify-center gap-2 rounded-[14px] text-sm font-semibold transition-all duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(201,168,111,0.18)] bg-[linear-gradient(180deg,rgba(217,176,106,0.94),rgba(193,150,79,0.96))] text-slate-950 shadow-[0_18px_28px_-22px_rgba(217,176,106,0.34),inset_0_1px_0_rgba(255,255,255,0.26)] hover:-translate-y-[1px] hover:brightness-[1.03] active:translate-y-0",
        secondary:
          "border border-[rgba(201,168,111,0.12)] bg-[rgba(43,48,58,0.92)] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-[1px] hover:bg-[rgba(49,55,66,0.96)] active:translate-y-0",
        ghost: "bg-transparent text-foreground hover:bg-white/[0.05] active:bg-white/[0.07]",
        outline:
          "border border-[rgba(201,168,111,0.14)] bg-[rgba(34,39,49,0.9)] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-[1px] hover:border-[rgba(201,168,111,0.2)] hover:bg-[rgba(43,48,58,0.96)] active:translate-y-0",
        destructive:
          "border border-rose-400/18 bg-[linear-gradient(180deg,rgba(244,63,94,0.92),rgba(190,24,93,0.96))] text-white shadow-[0_18px_28px_-22px_rgba(190,24,93,0.42)] hover:-translate-y-[1px] hover:brightness-95 active:translate-y-0"
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-xl px-3 text-[13px]",
        lg: "h-10 px-5",
        icon: "h-8 w-8 rounded-[12px]"
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
