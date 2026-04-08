import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderTimelineEvent } from "@/features/orders/order.service";

export function OrderTimelinePanel({ events }: { events: OrderTimelineEvent[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Timeline do pedido</CardTitle>
        <CardDescription>Vista lateral para nao esmagar informacao no grid.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event, index) => (
          <div className="flex gap-4" key={event.id}>
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary" />
              {index < events.length - 1 ? <div className="mt-2 h-12 w-px bg-border" /> : null}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-950">{event.title}</p>
                <Badge variant={event.tone === "success" ? "success" : event.tone === "warning" ? "warning" : "outline"}>{event.tone}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
