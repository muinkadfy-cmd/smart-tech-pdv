import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { ProductCatalogSummary } from "@/types/domain";

export function ProductCatalogSummaryCards({ summary }: { summary: ProductCatalogSummary }) {
  const cards = [
    ["SKUs no recorte", formatNumber(summary.totalProducts), "Resultado atual dos filtros aplicados"],
    ["Ativos", formatNumber(summary.activeProducts), "Base pronta para venda imediata"],
    ["Promoção", formatNumber(summary.promotionalProducts), "Itens com preço promocional no catálogo"],
    ["Estoque baixo", formatNumber(summary.lowStockProducts), "Itens pedindo reposição ou ajuste"],
    ["Unidades", formatNumber(summary.totalUnits), "Unidades do recorte atual do catálogo"],
    ["Margem média", formatPercent(summary.averageMargin || 0), "Leitura rápida do ganho médio do recorte"]
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {cards.map(([label, value, helper]) => (
        <Card className="executive-panel" key={String(label)}>
          <CardContent className="space-y-2.5 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <p className="font-display text-[24px] font-semibold leading-none text-slate-50">{value}</p>
            <div className="h-px bg-gradient-to-r from-slate-300/55 to-transparent" />
            <p className="text-[13px] leading-5 text-slate-400">{helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
