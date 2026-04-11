import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  {
    variants: {
      variant: {
        default: "border border-[rgba(201,168,111,0.2)] bg-[rgba(201,168,111,0.14)] text-[#f0dfbc]",
        secondary: "border border-white/8 bg-white/[0.06] text-slate-200",
        success: "border border-emerald-400/18 bg-emerald-500/12 text-emerald-200",
        warning: "border border-amber-400/18 bg-amber-500/12 text-amber-200",
        destructive: "border border-rose-400/18 bg-rose-500/12 text-rose-200",
        outline: "border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.04)] text-slate-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
