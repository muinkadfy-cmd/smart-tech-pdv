import { Card, CardContent } from "@/components/ui/card";
import type { OrderSummaryCard } from "@/features/orders/order.service";

export function OrderSummaryCards({ cards }: { cards: OrderSummaryCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card className="border-white/80 bg-white/90" key={card.label}>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
