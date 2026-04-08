import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { ProductCatalogSummary } from "@/types/domain";

export function ProductCatalogSummaryCards({ summary }: { summary: ProductCatalogSummary }) {
  const cards = [
    ["SKUs no recorte", formatNumber(summary.totalProducts), "Resultado atual dos filtros aplicados"],
    ["Ativos", formatNumber(summary.activeProducts), "Base pronta para venda imediata"],
    ["Promocionais", formatNumber(summary.promotionalProducts), "Produtos com preco promocional cadastrado"],
    ["Margem media", formatPercent(summary.averageMargin), "Media estimada a partir de custo e venda"],
    ["Estoque baixo", formatNumber(summary.lowStockProducts), "Itens pedindo reposicao ou ajuste"],
    ["Unidades", formatNumber(summary.totalUnits), "Unidades do recorte atual do catalogo"]
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {cards.map(([label, value, helper]) => (
        <Card className="executive-panel" key={String(label)}>
          <CardContent className="space-y-2 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="font-display text-[24px] font-semibold leading-none text-slate-950">{value}</p>
            <div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
            <p className="text-[13px] leading-5 text-slate-600">{helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
