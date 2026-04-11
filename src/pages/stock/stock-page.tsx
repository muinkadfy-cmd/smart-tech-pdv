import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { buildStockAlerts, filterProductsByFocus, summarizeStockMovements } from "@/features/stock/stock.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { StatCard } from "@/components/shared/stat-card";
import { RestockAlertsPanel } from "@/components/stock/restock-alerts-panel";
import { StockCoverageTable } from "@/components/stock/stock-coverage-table";
import { StockMovementsList } from "@/components/stock/stock-movements-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts, useSettingsSnapshot, useStockSnapshot } from "@/hooks/use-app-data";
import { hasActionAccessForProfile, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { confirmAction } from "@/lib/confirm-action";
import { formatCurrency } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { useAppShellStore } from "@/stores/app-shell-store";
import type { PurchaseReceiptInput } from "@/types/domain";

interface StockRouteState {
  initialTab?: "visao-geral" | "movimentar" | "historico";
  movementType?: "entrada" | "saida" | "ajuste" | "inventario";
  productId?: string;
  quantity?: number;
  reason?: string;
  purchaseId?: string;
  supplierName?: string;
  sizeBreakdown?: PurchaseReceiptInput["lines"];
}

export default function StockPage() {
  const { data: stockData, loading: loadingStock, reload: reloadStock } = useStockSnapshot();
  const { data: products, loading: loadingProducts, reload: reloadProducts } = useProducts();
  const settingsState = useSettingsSnapshot();
  const location = useLocation();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const setOperationFocus = useAppShellStore((state) => state.setOperationFocus);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "movimentar" | "historico">("visao-geral");
  const [movementProductId, setMovementProductId] = useState("");
  const [movementSize, setMovementSize] = useState("");
  const [movementType, setMovementType] = useState<"entrada" | "saida" | "ajuste" | "inventario">("entrada");
  const [movementQuantity, setMovementQuantity] = useState(1);
  const [movementReason, setMovementReason] = useState("");
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [pendingSupplierName, setPendingSupplierName] = useState<string | null>(null);
  const [pendingPurchaseLines, setPendingPurchaseLines] = useState<PurchaseReceiptInput["lines"]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (loadingStock || loadingProducts || settingsState.loading || !stockData || !products || !settingsState.data) {
    return <PageLoader />;
  }

  const currentRole = settingsState.data.currentUserRole;
  const activeLocalUser = resolveActiveLocalUserProfile(settingsState.data.localUsers, settingsState.data.activeLocalUserId);
  const canManageStock = hasActionAccessForProfile(activeLocalUser, "stock_manage", currentRole);
  const canRunInventory = hasActionAccessForProfile(activeLocalUser, "stock_inventory", currentRole);

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
  const selectedProduct = useMemo(
    () => focusedProducts.find((product) => product.id === movementProductId) ?? focusedProducts[0] ?? null,
    [focusedProducts, movementProductId]
  );
  const availableSizes = selectedProduct?.variants ?? [];

  useEffect(() => {
    const routeState = location.state as StockRouteState | null;
    if (!routeState) {
      return;
    }

    if (routeState.initialTab) {
      setActiveTab(routeState.initialTab);
    }

    if (routeState.movementType) {
      setMovementType(routeState.movementType);
      if (routeState.movementType === "inventario") {
        setMovementReason("Conferencia de inventario");
      }
    }

    if (routeState.productId) {
      setMovementProductId(routeState.productId);
      const routeProduct = products.find((product) => product.id === routeState.productId);
      if (routeProduct) {
        setOperationFocus(routeProduct.sector);
      }
    }

    if (routeState.quantity) {
      setMovementQuantity(Math.max(routeState.quantity, 1));
    }

    if (routeState.reason) {
      setMovementReason(routeState.reason);
    }

    setPendingPurchaseId(routeState.purchaseId ?? null);
    setPendingSupplierName(routeState.supplierName ?? null);
    setPendingPurchaseLines(routeState.sizeBreakdown ?? []);
    if (routeState.purchaseId) {
      setFeedback(`Recebimento da compra ${routeState.purchaseId} preparado no estoque.`);
    }
  }, [location.state, products, setOperationFocus]);

  async function handleCreateMovement(completePurchase = false) {
    if (!canManageStock) {
      setFeedback("O perfil atual pode consultar o estoque, mas não pode registrar movimentação manual.");
      return;
    }
    if (!selectedProduct || !movementSize || !movementReason.trim()) {
      setFeedback("Escolha produto, grade e motivo antes de registrar a movimentação.");
      return;
    }

    const normalizedQuantity = movementType === "saida" ? -Math.abs(movementQuantity) : Math.abs(movementQuantity);
    const movementLabel = movementType === "entrada" ? "entrada" : movementType === "saida" ? "saída" : movementType === "ajuste" ? "ajuste" : "inventário";
    const confirmed = confirmAction(
      `Registrar ${movementLabel} de ${Math.abs(movementQuantity)} unidade(s) para ${selectedProduct.name} na grade ${movementSize}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createStockMovement({
        productId: selectedProduct.id,
        type: movementType,
        quantity: normalizedQuantity,
        reason: movementReason.trim(),
        size: movementSize
      });
      if (completePurchase && pendingPurchaseId) {
        await appRepository.updatePurchaseStatus(pendingPurchaseId, "recebida");
      }
      reloadStock();
      reloadProducts();
      setFeedback(
        completePurchase && pendingPurchaseId
          ? `Entrada registrada e compra ${pendingPurchaseId} concluida no estoque.`
          : `Movimentação registrada para ${selectedProduct.name}.`
      );
      setMovementReason("");
      setMovementQuantity(1);
      if (completePurchase) {
        setPendingPurchaseId(null);
        setPendingSupplierName(null);
        setPendingPurchaseLines([]);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível registrar a movimentação.");
    }
  }

  async function handleReceivePurchaseBatch() {
    if (!canRunInventory) {
      setFeedback("Recebimento guiado e inventario completo estao liberados somente para administrador ou super admin.");
      return;
    }
    if (!pendingPurchaseId) {
      setFeedback("Nenhuma compra guiada esta pronta para recebimento em lote.");
      return;
    }

    const normalizedLines = pendingPurchaseLines.filter((line) => line.quantity > 0);
    if (!normalizedLines.length) {
      setFeedback("Distribua ao menos uma grade da compra antes de concluir o recebimento.");
      return;
    }

    const confirmed = confirmAction(`Receber a compra ${pendingPurchaseId} inteira no estoque com ${normalizedLines.length} grade(s)?`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.receivePurchaseIntoStock({
        purchaseId: pendingPurchaseId,
        reason: movementReason.trim() || `Recebimento da compra ${pendingPurchaseId}`,
        lines: normalizedLines
      });
      reloadStock();
      reloadProducts();
      setFeedback(`Compra ${pendingPurchaseId} recebida no estoque com a grade completa.`);
      setPendingPurchaseId(null);
      setPendingSupplierName(null);
      setPendingPurchaseLines([]);
      setMovementReason("");
      setMovementQuantity(1);
      setMovementSize("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível concluir o recebimento da compra.");
    }
  }

  async function handleSuggestedEntry(productId: string, size: string, quantity: number) {
    if (!canManageStock) {
      setFeedback("O perfil atual não pode aplicar reposição sugerida manualmente.");
      return;
    }
    const product = focusedProducts.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const confirmed = confirmAction(`Aplicar reposição sugerida de ${quantity} unidade(s) para ${product.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createStockMovement({
        productId,
        type: "entrada",
        quantity,
        reason: "Reposicao sugerida pelo painel",
        size
      });
      reloadStock();
      reloadProducts();
      setFeedback(`Reposição sugerida aplicada em ${product.name}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível aplicar a reposição sugerida.");
    }
  }

  function handlePrepareInventoryMode() {
    if (!canRunInventory) {
      setFeedback("Inventario e conferência física estão liberados somente para administrador ou super admin.");
      return;
    }
    setActiveTab("movimentar");
    setMovementType("inventario");
    setMovementReason((current) => current || "Conferencia de inventario");
    setFeedback("Modo inventario preparado. Escolha produto, grade e ajuste a contagem fisica.");
  }

  function handlePrepareEntryMode() {
    if (!canManageStock) {
      setFeedback("Nova entrada manual esta liberada somente para administrador ou super admin.");
      return;
    }
    setActiveTab("movimentar");
    setMovementType("entrada");
    setFeedback("Nova entrada pronta para lançamento. Escolha produto, grade e motivo da reposição.");
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        compact
        actions={
          <>
            {canRunInventory ? <Button onClick={handlePrepareInventoryMode} variant="outline">Inventario</Button> : null}
            {canManageStock ? <Button onClick={handlePrepareEntryMode}>Nova entrada</Button> : null}
          </>
        }
        badge={`${alerts.length} alertas de reposição ativos`}
        description="Estoque mais direto para repor, conferir e ajustar sem abrir blocos desnecessários."
        eyebrow="Estoque"
        title="Saude do inventario"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <div className="flex flex-wrap gap-2">
        {(["geral", "calcados", "roupas"] as const).map((mode) => (
          <Button key={mode} onClick={() => setOperationFocus(mode)} size="sm" variant={operationFocus === mode ? "default" : "outline"}>
            {getSectorLabel(mode)}
          </Button>
        ))}
      </div>

      <div className="section-rule grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <StatCard helper="Saldo consolidado do recorte atual" label="Total em estoque" trend="up" value={`${focusedUnits} unidades`} />
        <StatCard helper="Produtos exigindo compra ou ajuste" label="Baixo estoque" trend="down" value={`${focusedLowStock} SKUs`} />
        <StatCard helper="Base para margem e compra" label="Valor em estoque" trend="up" value={formatCurrency(focusedInventoryValue)} />
        <StatCard helper="Recorte operacional atual" label="Setor em foco" trend="neutral" value={getSectorLabel(operationFocus)} />
      </div>

      <Tabs onValueChange={(value) => setActiveTab(value as typeof activeTab)} value={activeTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="movimentar">Movimentar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="visao-geral">
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card className="executive-panel">
              <CardHeader>
                <CardTitle>Itens críticos</CardTitle>
                <CardDescription>Quebra de grade ou risco de ruptura nas proximas vendas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalProducts.map((product) => (
                  <div className="premium-tile flex items-center justify-between rounded-[18px] p-3.5" key={product.id}>
                    <div>
                      <div className="mb-1"><Badge variant="outline">{getSectorLabel(product.sector)}</Badge></div>
                      <p className="text-[14px] font-semibold text-slate-50">{product.name}</p>
                      <p className="text-[12px] text-slate-400">{product.color} • {product.gender}</p>
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
          <RestockAlertsPanel alerts={alerts} onApplySuggestion={canManageStock ? (alert) => void handleSuggestedEntry(alert.productId, focusedProducts.find((product) => product.id === alert.productId)?.variants[0]?.size ?? "", alert.recommendedUnits) : undefined} products={focusedProducts} />
        </TabsContent>

        <TabsContent value="movimentar">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="premium-tile grid gap-3 rounded-[20px] p-4">
                <p className="text-[14px] font-semibold text-slate-50">Registro operacional do inventário</p>
                <p className="text-[13px] text-slate-400">Faça entrada, saída, ajuste ou conferência com motivo obrigatório para manter rastreabilidade local.</p>
                <FormAssistPanel
                  description="Para evitar erro de estoque, escolha primeiro o produto, depois a grade e por último o motivo da movimentação."
                  tips={[
                    "Use entrada para reposição ou compra recebida.",
                    "Use saída quando a baixa não veio de venda automática.",
                    "Use ajuste ou inventário quando estiver corrigindo contagem física."
                  ]}
                  title="Como registrar sem confundir o estoque"
                />
                <select className="native-select h-10 text-[13px]" disabled={!canManageStock} onChange={(event) => { setMovementProductId(event.target.value); setMovementSize(""); }} value={selectedProduct?.id ?? ""}>
                  {focusedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 md:grid-cols-3">
                  <select className="native-select h-10 text-[13px]" disabled={!canManageStock} onChange={(event) => setMovementType(event.target.value as typeof movementType)} value={movementType}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="ajuste">Ajuste</option>
                    <option value="inventario">Inventário</option>
                  </select>
                  <select className="native-select h-10 text-[13px]" disabled={!canManageStock} onChange={(event) => setMovementSize(event.target.value)} value={movementSize}>
                    <option value="">Grade</option>
                    {availableSizes.map((variant) => (
                      <option key={variant.id} value={variant.size}>
                        {variant.size} · saldo {variant.stock}
                      </option>
                    ))}
                  </select>
                  <Input disabled={!canManageStock} min={1} onChange={(event) => setMovementQuantity(Number(event.target.value) || 1)} type="number" value={movementQuantity} />
                </div>
                <Input disabled={!canManageStock} onChange={(event) => setMovementReason(event.target.value)} placeholder="Motivo do ajuste, reposição, perda ou conferência" value={movementReason} />
                {pendingPurchaseId ? (
                  <div className="rounded-2xl border border-[rgba(201,168,111,0.16)] bg-[linear-gradient(180deg,rgba(43,43,50,0.96),rgba(28,28,34,0.98))] p-4 text-sm text-slate-200">
                    <p className="font-semibold text-slate-50">Recebimento guiado de compra</p>
                    <p className="mt-2 text-slate-400">
                      Compra {pendingPurchaseId}{pendingSupplierName ? ` • ${pendingSupplierName}` : ""}. Revise produto, grade e quantidade antes de concluir o recebimento.
                    </p>
                    {pendingPurchaseLines.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {pendingPurchaseLines.map((line) => (
                          <div className="rounded-[16px] border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-2" key={`${line.productId}-${line.size}`}>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">{line.size}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-50">{line.quantity} unidade(s)</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!canManageStock} onClick={() => void handleCreateMovement()}>
                    Registrar movimentação
                  </Button>
                  {pendingPurchaseId && movementType === "entrada" ? (
                    <Button disabled={!canManageStock} onClick={() => void handleCreateMovement(true)} variant="outline">
                      Registrar entrada e concluir compra
                    </Button>
                  ) : null}
                  {pendingPurchaseId && pendingPurchaseLines.length > 0 ? (
                    <Button disabled={!canRunInventory} onClick={() => void handleReceivePurchaseBatch()} variant="outline">
                      Receber grade completa e concluir compra
                    </Button>
                  ) : null}
                  <Badge variant="outline">Offline com trilha local</Badge>
                </div>
                {!canManageStock ? (
                  <div className="rounded-2xl border border-[rgba(201,168,111,0.14)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
                    Este perfil esta em modo consulta no estoque. Para lançar entrada, saída, ajuste ou inventário, troque para um perfil administrador ou super admin.
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4">
                {[
                  ["Entradas mapeadas", `${movementSummary.entries} unidades`],
                  ["Saidas mapeadas", `${movementSummary.exits} unidades`],
                  ["Ajustes", `${movementSummary.adjustments} unidades`],
                  ["Inventarios", `${movementSummary.inventoryChecks} conferências`]
                ].map(([label, value]) => (
                  <div className="premium-tile rounded-[18px] p-4" key={label}>
                    <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.76)]">{label}</p>
                    <p className="mt-2 font-display text-[22px] font-semibold text-slate-50">{value}</p>
                  </div>
                ))}
                <div className="premium-tile rounded-[18px] p-4">
                  <p className="text-[14px] font-semibold text-slate-50">Controles da rotina</p>
                  <div className="mt-3 space-y-2 text-[13px] text-slate-400">
                    <p>Entradas e saídas agora pedem confirmação antes de gravar.</p>
                    <p>Ajuste e inventário exigem motivo para manter trilha local confiável.</p>
                    <p>Reposições sugeridas também entram com confirmação para evitar lançamentos indevidos.</p>
                  </div>
                </div>
                <RecentAreaAuditPanel
                  area="Estoque"
                  description="Entradas, saídas, ajustes e reposições aplicadas no inventário."
                  emptyMessage="As próximas movimentações de estoque vão aparecer aqui."
                  title="Últimas ações do inventário"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <StockMovementsList movements={stockData.movements} products={focusedProducts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
