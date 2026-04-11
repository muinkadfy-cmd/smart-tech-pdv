import { ProductImagePreview } from "@/components/shared/product-image-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product, StockAlert } from "@/types/domain";

function getSeverityMeta(severity: StockAlert["severity"]) {
  if (severity === "high") {
    return {
      label: "Crítico",
      variant: "destructive" as const,
      helper: "Risco real de ruptura no balcão."
    };
  }

  return {
    label: "Atenção",
    variant: "warning" as const,
    helper: "Cobertura curta para os próximos dias."
  };
}

export function RestockAlertsPanel({
  alerts,
  products = [],
  onApplySuggestion
}: {
  alerts: StockAlert[];
  products?: Product[];
  onApplySuggestion?: (alert: StockAlert) => void;
}) {
  const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

  return (
    <Card className="executive-panel">
      <CardHeader>
        <CardTitle>Reposição recomendada</CardTitle>
        <CardDescription>Itens que merecem compra, ajuste ou entrada manual antes de virar falta de grade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            const meta = getSeverityMeta(alert.severity);
            const product = productMap[alert.productId];

            return (
              <div className="panel-block rounded-[20px] p-4" key={alert.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <ProductImagePreview
                      compact
                      className="w-[118px]"
                      imageDataUrl={product?.imageDataUrl}
                      imageHint={product?.imageHint}
                      modalDescription="Foto real ampliada para validar o item antes da reposição."
                      name={alert.productName}
                      sector={product?.sector}
                    />
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant="outline">{alert.sku}</Badge>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-slate-50">{alert.productName}</p>
                        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{alert.reason}</p>
                      </div>
                      <p className="text-[12px] leading-5 text-slate-400">{meta.helper}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:w-[250px] lg:grid-cols-1">
                    <div className="premium-tile rounded-[18px] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.76)]">Disponível agora</p>
                      <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{alert.unitsAvailable}</p>
                    </div>
                    <div className="premium-tile rounded-[18px] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.76)]">Entrada sugerida</p>
                      <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">+{alert.recommendedUnits}</p>
                    </div>
                  </div>
                </div>

                {onApplySuggestion ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => onApplySuggestion(alert)} size="sm" variant="outline">
                      Aplicar reposição sugerida
                    </Button>
                    <Badge variant="secondary">Registro com trilha local</Badge>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="empty-state-box text-sm">Nenhum item desse recorte está pedindo reposição agora.</div>
        )}
      </CardContent>
    </Card>
  );
}
