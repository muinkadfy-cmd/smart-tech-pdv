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
  up: "text-emerald-600 bg-emerald-500/10",
  down: "text-rose-600 bg-rose-500/10",
  neutral: "text-slate-500 bg-slate-200"
};

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  trend: Trend;
}

export function StatCard({ label, value, helper, trend }: StatCardProps) {
  const TrendIcon = trendIcon[trend];

  return (
    <Card className="executive-panel overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-2 font-display text-[24px] font-semibold leading-none text-slate-950">{value}</p>
          </div>
          <div className={cn("rounded-2xl border border-white/60 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]", trendStyles[trend])}>
            <TrendIcon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
        <p className="text-[13px] leading-5 text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}
