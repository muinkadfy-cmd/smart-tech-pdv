import { Card, CardContent } from "@/components/ui/card";
import type { PurchaseSummaryCard } from "@/features/purchases/purchase.service";

export function PurchaseSummaryCards({ cards }: { cards: PurchaseSummaryCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="workspace-strip" key={card.label}>
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
            <p className="font-display text-3xl font-semibold text-slate-50">{card.value}</p>
            <p className="text-sm leading-6 text-muted-foreground">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
