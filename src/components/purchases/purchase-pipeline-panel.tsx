import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchasePipelineItem } from "@/features/purchases/purchase.service";

export function PurchasePipelinePanel({ items }: { items: PurchasePipelineItem[] }) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader>
        <CardTitle>Pipeline de abastecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.id}</p>
                <p className="text-sm text-muted-foreground">{item.supplierName}</p>
              </div>
              <Badge variant="outline">{item.status}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{item.helper}</span>
              <span className="font-semibold text-slate-950">{item.total}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
