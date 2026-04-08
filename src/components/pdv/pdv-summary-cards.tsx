import { Card, CardContent } from "@/components/ui/card";
import type { PdvSummaryCard } from "@/features/pdv/pdv.service";

export function PdvSummaryCards({ cards }: { cards: PdvSummaryCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="executive-panel" key={card.label}>
          <CardContent className="space-y-2 p-4">
            <p className="text-[12px] uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
            <p className="font-display text-[22px] font-semibold leading-none text-slate-950">{card.value}</p>
            <div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
            <p className="text-[13px] leading-5 text-slate-600">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
