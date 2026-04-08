import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderPriorityItem } from "@/features/orders/order.service";

export function OrderPriorityList({ items }: { items: OrderPriorityItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Prioridades do turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.id}</p>
                <p className="text-sm text-muted-foreground">{item.customerName}</p>
              </div>
              <Badge variant={item.priority === "alta" ? "destructive" : item.priority === "media" ? "warning" : "success"}>{item.priority}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{item.status}</span>
              <span>{item.totalLabel}</span>
              <span>{item.ageLabel}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
