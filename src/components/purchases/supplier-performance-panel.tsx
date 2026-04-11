import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupplierPerformanceItem } from "@/features/purchases/purchase.service";

export function SupplierPerformancePanel({ items }: { items: SupplierPerformanceItem[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Performance de fornecedores</CardTitle>
        <CardDescription>Prazo e profundidade da base para decidir compra com menos improviso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="premium-tile rounded-[20px] p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-50">{item.name}</p>
                <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "outline"}>
                  {item.leadTimeLabel}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.linkedProductsLabel}</p>
            </div>
          ))
        ) : (
          <div className="empty-state-box text-sm">Cadastre fornecedores para montar leitura de performance.</div>
        )}
      </CardContent>
    </Card>
  );
}
