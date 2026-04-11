import { Card, CardContent } from "@/components/ui/card";
import type { FinanceSummaryCard } from "@/features/finance/finance.service";

export function FinanceSummaryCards({ cards }: { cards: FinanceSummaryCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="executive-panel" key={card.label}>
          <CardContent className="space-y-2.5 p-4">
            <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className="font-display text-[24px] font-semibold leading-none text-slate-50">{card.value}</p>
            <div className="h-px bg-gradient-to-r from-slate-300/55 to-transparent" />
            <p className="text-[13px] leading-5 text-slate-400">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
