import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { buildStockAlerts, filterProductsByFocus, summarizeStockMovements } from "@/features/stock/stock.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { StatCard } from "@/components/shared/stat-card";
import { RestockAlertsPanel } from "@/components/stock/restock-alerts-panel";
import { StockCoverageTable } from "@/components/stock/stock-coverage-table";
import { StockMovementsList } from "@/components/stock/stock-movements-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts, useStockSnapshot } from "@/hooks/use-app-data";
import { formatCurrency } from "@/lib/utils";
import { useAppShellStore } from "@/stores/app-shell-store";

export default function StockPage() {
  const { data: stockData, loading: loadingStock } = useStockSnapshot();
  const { data: products, loading: loadingProducts } = useProducts();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const setOperationFocus = useAppShellStore((state) => state.setOperationFocus);

  if (loadingStock || loadingProducts || !stockData || !products) {
    return null;
  }

  const focusedProducts = filterProductsByFocus(products, operationFocus);
  const movementSummary = summarizeStockMovements(stockData.movements);
  const fallbackAlerts = buildStockAlerts(focusedProducts);
  const alerts = fallbackAlerts;
  const criticalProducts = focusedProducts.filter((product) => product.variants.reduce((sum, variant) => sum + variant.stock, 0) <= 10);
  const focusedUnits = focusedProducts.flatMap((product) => product.variants).reduce((sum, variant) => sum + variant.stock, 0);
  const focusedInventoryValue = focusedProducts.reduce(
    (sum, product) => sum + product.variants.reduce((acc, variant) => acc + variant.stock * product.costPrice, 0),
    0
  );
  const focusedLowStock = criticalProducts.length;

  return (
    <div className="space-y-5">
      <ModuleHeader
        actions={
          <>
            <Button variant="outline">Inventario</Button>
            <Button>Nova entrada</Button>
          </>
        }
        badge={`${alerts.length} alertas de reposicao ativos`}
        description="Painel de estoque com leitura mais operacional por setor, sem misturar roupas e calçados quando o operador quer foco total em uma área."
        eyebrow="Estoque"
        title="Saude do inventario"
      />

      <div className="flex flex-wrap gap-2">
        {(["geral", "calcados", "roupas"] as const).map((mode) => (
          <Button key={mode} onClick={() => setOperationFocus(mode)} size="sm" variant={operationFocus === mode ? "default" : "outline"}>
            {getSectorLabel(mode)}
          </Button>
        ))}
      </div>

      <div className="section-rule grid gap-3 pt-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard helper="Saldo consolidado do recorte atual" label="Total em estoque" trend="up" value={`${focusedUnits} unidades`} />
        <StatCard helper="Produtos exigindo compra ou ajuste" label="Baixo estoque" trend="down" value={`${focusedLowStock} SKUs`} />
        <StatCard helper="Base para margem e compra" label="Valor em estoque" trend="up" value={formatCurrency(focusedInventoryValue)} />
        <StatCard helper="Recorte operacional atual" label="Setor em foco" trend="neutral" value={getSectorLabel(operationFocus)} />
      </div>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Controle do estoque</p>
            <p className="text-[15px] font-semibold text-slate-950">A leitura do setor ativo agora fica mais óbvia para reposição, contagem e ajuste.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Setor</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{getSectorLabel(operationFocus)}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Alertas</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{alerts.length} ativos</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ação rápida</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Entrada + inventário</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1fr_1fr]">
        <RestockAlertsPanel alerts={alerts} products={focusedProducts} />
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Resumo por operacao</CardTitle>
            <CardDescription>Separado para evitar uma tela longa e pesada.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ["Entradas mapeadas", `${movementSummary.entries} unidades`],
              ["Saidas mapeadas", `${movementSummary.exits} unidades`],
              ["Ajustes", `${movementSummary.adjustments} unidades`],
              ["Inventarios", `${movementSummary.inventoryChecks} conferencias`]
            ].map(([label, value]) => (
              <div className="panel-block rounded-[18px] p-3.5" key={label}>
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-2 font-display text-[22px] font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visao geral</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentacoes</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="visao-geral">
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card className="executive-panel">
              <CardHeader>
                <CardTitle>Itens criticos</CardTitle>
                <CardDescription>Quebra de grade ou risco de ruptura nas proximas vendas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalProducts.map((product) => (
                  <div className="panel-block flex items-center justify-between rounded-[18px] p-3.5" key={product.id}>
                    <div>
                      <div className="mb-1"><Badge variant="outline">{getSectorLabel(product.sector)}</Badge></div>
                      <p className="text-[14px] font-semibold text-slate-950">{product.name}</p>
                      <p className="text-[12px] text-slate-600">{product.color} • {product.gender}</p>
                    </div>
                    <Badge variant="warning">
                      {product.variants.reduce((sum, variant) => sum + variant.stock, 0)} {getSectorUnitLabel(product.sector)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <StockCoverageTable coverage={stockData.coverage} products={focusedProducts} />
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <StockMovementsList movements={stockData.movements} products={focusedProducts} />
        </TabsContent>

        <TabsContent value="inventario">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-6 lg:grid-cols-3">
              {[
                ["Contagem cega", "Fila pronta para separar por setor sem alongar a tela principal."],
                ["Conferencia por setor", "Bloco futuro para salão, estoque e vitrine."],
                ["Divergencias", "Espaço reservado para tratar quebra de saldo com rastreabilidade."]
              ].map(([item, helper]) => (
                <div className="panel-block rounded-[18px] p-4" key={item}>
                  <p className="text-[14px] font-semibold text-slate-950">{item}</p>
                  <p className="mt-2 text-[13px] text-slate-600">{helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajustes">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              <div className="panel-block rounded-[18px] p-4">
                <p className="text-[14px] font-semibold text-slate-950">Ajuste pontual</p>
                <p className="mt-2 text-[13px] text-slate-600">Use para avaria, perda ou sobra localizada, sem depender de modal para tudo.</p>
              </div>
              <div className="panel-block rounded-[18px] p-4">
                <p className="text-[14px] font-semibold text-slate-950">Historico por produto</p>
                <p className="mt-2 text-[13px] text-slate-600">Mantem rastreabilidade por SKU e prepara o fluxo do proximo lote.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
