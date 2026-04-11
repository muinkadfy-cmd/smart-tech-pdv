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
  compact?: boolean;
}

export function ModuleHeader({ eyebrow, title, description, badge, actions, className, compact = false }: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        "module-header-shell flex flex-col lg:flex-row lg:items-start lg:justify-between",
        compact ? "gap-3" : "gap-4",
        className
      )}
    >
      <div className={cn("min-w-0", compact ? "space-y-2" : "space-y-2.5")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="module-header-eyebrow rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e7d3a7]">
            {eyebrow}
          </span>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
          <h1
            className={cn(
              "module-header-title font-display font-semibold leading-tight tracking-[-0.03em] text-slate-50",
              compact ? "text-[24px] sm:text-[28px] xl:text-[32px]" : "text-[28px] sm:text-[32px] xl:text-[38px]"
            )}
          >
            {title}
          </h1>
          <p className={cn("module-header-description max-w-3xl text-slate-400", compact ? "text-[13px] leading-5 sm:text-[14px] sm:leading-6" : "text-[14px] leading-6 sm:text-[15px] sm:leading-7")}>
            {description}
          </p>
        </div>
      </div>
      {actions ? (
        <div className={cn("module-header-actions flex flex-wrap items-center gap-2.5 self-start lg:self-auto", compact ? "px-3 py-2" : "px-3.5 py-2.5")}>{actions}</div>
      ) : null}
    </div>
  );
}
