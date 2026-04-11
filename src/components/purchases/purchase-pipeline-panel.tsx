import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchasePipelineItem } from "@/features/purchases/purchase.service";

function getPurchaseStatusMeta(status: string) {
  if (status === "recebida") {
    return { label: "Recebida", variant: "success" as const };
  }

  if (status === "conferida") {
    return { label: "Conferida", variant: "warning" as const };
  }

  return { label: "Aberta", variant: "outline" as const };
}

export function PurchasePipelinePanel({ items }: { items: PurchasePipelineItem[] }) {
  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Pipeline de abastecimento</CardTitle>
        <CardDescription>Resumo do estágio de cada lote para a equipe não perder o próximo passo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const meta = getPurchaseStatusMeta(item.status);
            return (
              <div className="premium-tile rounded-[20px] p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-50">{item.id}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.supplierName}</p>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm leading-6 text-muted-foreground">{item.helper}</span>
                  <span className="font-semibold text-slate-50">{item.total}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state-box text-sm">Nenhum lote entrou no pipeline desse recorte.</div>
        )}
      </CardContent>
    </Card>
  );
}
