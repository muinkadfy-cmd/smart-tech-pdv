import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrderPriorityLabel, type OrderPriorityItem } from "@/features/orders/order.service";

export function OrderPriorityList({ items }: { items: OrderPriorityItem[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Prioridades do turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="premium-tile rounded-2xl p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-50">{item.id}</p>
                  <p className="text-sm text-slate-400">{item.customerName}</p>
                </div>
                <Badge variant={item.priority === "alta" ? "destructive" : item.priority === "media" ? "warning" : "success"}>
                  {getOrderPriorityLabel(item.priority)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                <span>{item.status}</span>
                <span>{item.totalLabel}</span>
                <span>{item.ageLabel}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-box text-sm">Nenhum pedido precisa de priorização forte neste recorte.</div>
        )}
      </CardContent>
    </Card>
  );
}
