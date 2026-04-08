import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModuleHeader({ eyebrow, title, description, badge, actions, className }: ModuleHeaderProps) {
  return (
    <div className={cn("module-header-shell flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
            {eyebrow}
          </span>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-[34px] font-semibold leading-tight text-slate-950 sm:text-[38px]">{title}</h1>
          <p className="max-w-3xl text-[15px] leading-7 text-slate-600">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] border border-border/70 bg-white/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">{actions}</div> : null}
    </div>
  );
}
