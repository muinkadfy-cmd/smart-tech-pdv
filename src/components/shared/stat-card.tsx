import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Trend } from "@/types/domain";

const trendIcon: Record<Trend, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus
};

const trendStyles: Record<Trend, string> = {
  up: "text-[#d8bd8a] bg-[rgba(201,168,111,0.10)]",
  down: "text-[#caa269] bg-[rgba(201,168,111,0.08)]",
  neutral: "text-slate-300 bg-[rgba(255,255,255,0.05)]"
};

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  trend: Trend;
  highlight?: boolean;
}

export function StatCard({ label, value, helper, trend, highlight = false }: StatCardProps) {
  const TrendIcon = trendIcon[trend];

  return (
    <Card className={cn("stat-card executive-panel overflow-hidden", highlight && "border-[rgba(201,168,111,0.18)] bg-[linear-gradient(180deg,rgba(32,37,46,0.98),rgba(18,22,30,0.98))]")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 font-display text-[24px] font-semibold leading-none text-slate-50">{value}</p>
          </div>
          <div className={cn("rounded-2xl border border-[rgba(201,168,111,0.14)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]", trendStyles[trend])}>
            <TrendIcon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-[rgba(201,168,111,0.18)] to-transparent" />
        <p className="text-[13px] leading-5 text-slate-400">{helper}</p>
      </CardContent>
    </Card>
  );
}
