import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product, StockAlert } from "@/types/domain";

export function RestockAlertsPanel({ alerts, products = [] }: { alerts: StockAlert[]; products?: Product[] }) {
  const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Reposicao recomendada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div className="panel-block rounded-[18px] p-3.5" key={alert.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ProductImagePlaceholder
                  compact
                  className="w-[118px]"
                  imageHint={productMap[alert.productId]?.imageHint}
                  name={alert.productName}
                  sector={productMap[alert.productId]?.sector}
                />
                <div>
                <p className="text-[14px] font-semibold text-slate-950">{alert.productName}</p>
                <p className="text-[12px] text-slate-600">{alert.sku} • {alert.reason}</p>
                </div>
              </div>
              <Badge variant={alert.severity === "high" ? "destructive" : "warning"}>{alert.severity === "high" ? "Critico" : "Atencao"}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-[12px] text-slate-600">
              <span>Disponivel: {alert.unitsAvailable}</span>
              <span>Sugestao: +{alert.recommendedUnits}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
