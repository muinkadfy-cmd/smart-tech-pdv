import { Card, CardContent } from "@/components/ui/card";
import type { ReportHighlightCard } from "@/features/reports/reports.service";

export function ReportHighlightCards({ cards }: { cards: ReportHighlightCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="executive-panel" key={card.label}>
          <CardContent className="space-y-3 p-4">
            <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className="font-display text-[22px] font-semibold leading-none text-slate-50">{card.value}</p>
            <div className="h-px bg-gradient-to-r from-[rgba(201,168,111,0.18)] to-transparent" />
            <p className="text-[13px] leading-5 text-slate-400">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
