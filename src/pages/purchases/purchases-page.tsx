import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { buildPurchasePipeline, buildPurchaseSummary, buildSupplierPerformance, filterPurchases } from "@/features/purchases/purchase.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { ResultLimitControl } from "@/components/shared/result-limit-control";
import { PurchasePipelinePanel } from "@/components/purchases/purchase-pipeline-panel";
import { PurchaseSummaryCards } from "@/components/purchases/purchase-summary-cards";
import { SupplierPerformancePanel } from "@/components/purchases/supplier-performance-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProducts, usePurchases, useSuppliers } from "@/hooks/use-app-data";
import { confirmAction } from "@/lib/confirm-action";
import { formatCurrency, formatDate } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { recordAuditEntry } from "@/services/audit/audit-log.service";
import type { PurchaseCreateInput } from "@/types/domain";

interface PurchasesRouteState {
  query?: string;
}

function createEmptyPurchaseDraft(): PurchaseCreateInput {
  return {
    supplierId: "",
    productId: "",
    quantity: 0,
    unitCost: 0,
    status: "aberta",
    sizeBreakdown: []
  };
}

export default function PurchasesPage() {
  const PURCHASE_BASE_LIMIT = 6;
  const PURCHASE_STEP = 6;
  const navigate = useNavigate();
  const location = useLocation();
  const { data: purchasesData, loading: loadingPurchases, reload: reloadPurchases } = usePurchases();
  const { data: suppliersData, loading: loadingSuppliers } = useSuppliers();
  const { data: productsData, loading: loadingProducts } = useProducts();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseCreateInput>(() => createEmptyPurchaseDraft());
  const [visiblePurchaseCount, setVisiblePurchaseCount] = useState(PURCHASE_BASE_LIMIT);

  const purchases = purchasesData ?? [];
  const suppliers = suppliersData ?? [];
  const products = productsData ?? [];
  const loading = loadingPurchases || loadingSuppliers || loadingProducts;

  const filteredPurchases = useMemo(() => {
    const base = filterPurchases(purchases, status);
    const normalizedQuery = query.trim().toLowerCase();
    const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name]));

    return base.filter((purchase) => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      return [purchase.id, purchase.status, supplierMap[purchase.supplierId] ?? purchase.supplierId].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [purchases, query, status, suppliers]);

  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])), [suppliers]);
  const productMap = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product.name])), [products]);
  const selectedProduct = useMemo(() => products.find((product) => product.id === purchaseDraft.productId) ?? null, [products, purchaseDraft.productId]);
  const cards = useMemo(() => buildPurchaseSummary(filteredPurchases), [filteredPurchases]);
  const pipeline = useMemo(() => buildPurchasePipeline(filteredPurchases, suppliers), [filteredPurchases, suppliers]);
  const supplierPerformance = useMemo(() => buildSupplierPerformance(suppliers), [suppliers]);
  const receivedCount = useMemo(() => filteredPurchases.filter((purchase) => purchase.status === "recebida").length, [filteredPurchases]);
  const openValue = useMemo(() => filteredPurchases.filter((purchase) => purchase.status !== "recebida").reduce((sum, purchase) => sum + purchase.total, 0), [filteredPurchases]);
  const purchaseDraftQuantity = useMemo(
    () => purchaseDraft.sizeBreakdown?.reduce((sum, entry) => sum + entry.quantity, 0) ?? 0,
    [purchaseDraft.sizeBreakdown]
  );
  const purchasePreviewTotal = useMemo(() => Number((purchaseDraftQuantity * purchaseDraft.unitCost).toFixed(2)), [purchaseDraftQuantity, purchaseDraft.unitCost]);
  const selectedSupplierName = supplierMap[purchaseDraft.supplierId];
  const selectedProductName = productMap[purchaseDraft.productId];
  const visiblePurchases = useMemo(() => filteredPurchases.slice(0, visiblePurchaseCount), [filteredPurchases, visiblePurchaseCount]);

  useEffect(() => {
    setVisiblePurchaseCount(PURCHASE_BASE_LIMIT);
  }, [status, query, purchases.length, suppliers.length]);

  useEffect(() => {
    const routeState = location.state as PurchasesRouteState | null;
    if (routeState?.query) {
      setQuery(routeState.query);
    }
  }, [location.state]);

  useEffect(() => {
    if (!selectedProduct) {
      setPurchaseDraft((current) => ({ ...current, quantity: 0, sizeBreakdown: [] }));
      return;
    }

    setPurchaseDraft((current) => {
      const currentMap = new Map((current.sizeBreakdown ?? []).map((entry) => [entry.size, entry.quantity]));
      const nextBreakdown = selectedProduct.variants.map((variant) => ({
        size: variant.size,
        quantity: currentMap.get(variant.size) ?? 0
      }));
      const nextQuantity = nextBreakdown.reduce((sum, entry) => sum + entry.quantity, 0);

      return {
        ...current,
        quantity: nextQuantity,
        sizeBreakdown: nextBreakdown
      };
    });
  }, [selectedProduct?.id]);

  function getNextPurchaseStatus(currentStatus: (typeof purchases)[number]["status"]) {
    if (currentStatus === "aberta") {
      return "conferida" as const;
    }

    if (currentStatus === "conferida") {
      return "recebida" as const;
    }

    return "conferida" as const;
  }

  async function handleCopyPurchase(purchase: (typeof filteredPurchases)[number]) {
    const payload = `${purchase.id} • ${supplierMap[purchase.supplierId] ?? purchase.supplierId} • ${formatCurrency(purchase.total)} • status ${purchase.status}`;
    try {
      await navigator.clipboard.writeText(payload);
      recordAuditEntry({
        area: "Compras",
        action: purchase.status === "aberta" ? "Recebimento acompanhado" : "Resumo de compra copiado",
        details: `${purchase.id} foi preparado para ação operacional com ${supplierMap[purchase.supplierId] ?? purchase.supplierId}.`
      });
      setFeedback(`Resumo da compra ${purchase.id} copiado.`);
    } catch {
      setFeedback(`Não foi possível copiar a compra ${purchase.id}.`);
    }
  }

  async function handlePurchaseStatus(purchaseId: string, nextStatus: (typeof purchases)[number]["status"]) {
    const confirmed = confirmAction(`Atualizar a compra ${purchaseId} para "${nextStatus}"? Isso altera a leitura operacional de recebimento e entra na auditoria local.`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updatePurchaseStatus(purchaseId, nextStatus);
      reloadPurchases();
      setFeedback(`Compra ${purchaseId} atualizada para ${nextStatus}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar a compra.");
    }
  }

  async function handleCreatePurchase() {
    if (!purchaseDraft.supplierId || !purchaseDraft.productId) {
      setFeedback("Selecione fornecedor e produto antes de abrir a compra.");
      return;
    }

    if (purchaseDraft.quantity <= 0 || purchaseDraft.unitCost <= 0) {
      setFeedback("Distribua ao menos uma grade e informe custo unitário maior que zero.");
      return;
    }

    const confirmed = confirmAction(
      `Abrir compra para ${selectedSupplierName ?? "fornecedor selecionado"} com ${selectedProductName ?? "produto selecionado"}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createPurchase(purchaseDraft);
      reloadPurchases();
      setPurchaseDraft(createEmptyPurchaseDraft());
      setFeedback("Compra criada com sucesso para acompanhamento e conferência.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível criar a compra.");
    }
  }

  function handleOpenStockReceipt(purchase: (typeof filteredPurchases)[number]) {
    navigate("/estoque", {
      state: {
        initialTab: "movimentar",
        movementType: "entrada",
        productId: purchase.productId,
        quantity: purchase.quantity ?? 1,
        reason: `Recebimento da compra ${purchase.id}`,
        purchaseId: purchase.id,
        supplierName: supplierMap[purchase.supplierId] ?? purchase.supplierId,
        sizeBreakdown: purchase.lines?.filter((line) => line.size && line.quantity > 0).map((line) => ({
          productId: line.productId,
          size: line.size!,
          quantity: line.quantity
        }))
      }
    });
  }

  function handleSizeBreakdownChange(size: string, quantity: number) {
    setPurchaseDraft((current) => {
      const nextBreakdown = (current.sizeBreakdown ?? []).map((entry) => (entry.size === size ? { ...entry, quantity } : entry));
      return {
        ...current,
        quantity: nextBreakdown.reduce((sum, entry) => sum + entry.quantity, 0),
        sizeBreakdown: nextBreakdown
      };
    });
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Conferencia por lote pronta"
        compact
        description="Compras mais diretas para buscar lote, conferir recebimento e agir sem blocos sobrando."
        eyebrow="Compras"
        title="Abastecimento controlado"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <PurchaseSummaryCards cards={cards} />

      <Card className="executive-panel">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por compra, fornecedor ou status" value={query} />
          </div>
          <select className="native-select h-11 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">Todos status</option>
            <option value="aberta">Aberta</option>
            <option value="conferida">Conferida</option>
            <option value="recebida">Recebida</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Lotes no radar</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{filteredPurchases.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Recorte atual.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Capital aberto</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{formatCurrency(openValue)}</p>
                <p className="mt-1 text-[12px] text-slate-400">Ainda sem recebimento total.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Fornecedores</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{suppliers.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Base ativa para reposicao.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Compras em andamento</CardTitle>
              <CardDescription>Fila de lotes para acompanhamento do comprador ou do estoque.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 2xl:grid-cols-2">
              {filteredPurchases.length > 0 ? (
                visiblePurchases.map((purchase) => (
                  <Card className="premium-tile shadow-none" key={purchase.id}>
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-2xl font-semibold text-slate-50">{purchase.id}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{supplierMap[purchase.supplierId] ?? purchase.supplierId}</p>
                        </div>
                        <Badge variant="outline">{purchase.status}</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Total: {formatCurrency(purchase.total)}</p>
                        <p>Itens: {purchase.items}</p>
                        <p>Produto: {purchase.productId ? productMap[purchase.productId] ?? purchase.productId : "Nao vinculado"}</p>
                        <p>Quantidade prevista: {purchase.quantity ?? 0}</p>
                        {purchase.lines?.some((line) => line.size) ? (
                          <p>
                            Grade prevista:{" "}
                            {purchase.lines
                              ?.filter((line) => line.size)
                              .map((line) => `${line.size}(${line.quantity})`)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <p>Abertura: {formatDate(purchase.createdAt)}</p>
                        {purchase.receivedAt ? <p>Recebimento: {formatDate(purchase.receivedAt)}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => handleOpenStockReceipt(purchase)} size="sm">
                          {purchase.status === "recebida" ? "Reforçar no estoque" : "Receber no estoque"}
                        </Button>
                        <Button onClick={() => void handlePurchaseStatus(purchase.id, getNextPurchaseStatus(purchase.status))} size="sm" variant="outline">
                          {purchase.status === "aberta" ? "Marcar conferida" : purchase.status === "conferida" ? "Marcar recebida" : "Reabrir para conferência"}
                        </Button>
                        <Button onClick={() => void handleCopyPurchase(purchase)} size="sm" variant="outline">
                          {purchase.status === "aberta" ? "Atualizar recebimento" : "Copiar resumo"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="empty-state-box text-sm xl:col-span-2">Nenhuma compra caiu nesse filtro.</div>
              )}
            </CardContent>
          </Card>
          <ResultLimitControl
            baseCount={PURCHASE_BASE_LIMIT}
            itemLabel="compras"
            onReset={() => setVisiblePurchaseCount(PURCHASE_BASE_LIMIT)}
            onShowMore={() => setVisiblePurchaseCount((current) => Math.min(current + PURCHASE_STEP, filteredPurchases.length))}
            totalCount={filteredPurchases.length}
            visibleCount={visiblePurchases.length}
          />

          <PurchasePipelinePanel items={pipeline} />
        </div>

        <div className="space-y-6">
          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Nova compra</CardTitle>
              <CardDescription>Abra lote novo sem sair da fila operacional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormAssistPanel
                description="Escolha primeiro o fornecedor e o item principal do lote. Depois ajuste quantidade, custo e estágio inicial."
                tips={[
                  "Use 'aberta' quando o pedido ainda vai ser validado pelo estoque.",
                  "Se o lote já chegou, distribua por grade antes de marcar como recebida.",
                  "O valor total é calculado automaticamente pelo custo unitário e pela soma da grade."
                ]}
                title="Abertura curta de lote"
              />
              <div className="grid gap-3">
                <select
                  className="native-select h-11 text-sm"
                  onChange={(event) => setPurchaseDraft((current) => ({ ...current, supplierId: event.target.value }))}
                  value={purchaseDraft.supplierId}
                >
                  <option value="">Selecionar fornecedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <select
                  className="native-select h-11 text-sm"
                  onChange={(event) => {
                    const nextProduct = products.find((product) => product.id === event.target.value);
                    setPurchaseDraft((current) => ({
                      ...current,
                      productId: event.target.value,
                      unitCost: nextProduct?.costPrice ?? current.unitCost
                    }));
                  }}
                  value={purchaseDraft.productId}
                >
                  <option value="">Selecionar produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    min={0}
                    onChange={(event) => setPurchaseDraft((current) => ({ ...current, unitCost: Number(event.target.value) || 0 }))}
                    placeholder="Custo unitário"
                    step="0.01"
                    type="number"
                    value={purchaseDraft.unitCost}
                  />
                  <div className="premium-tile rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Peças no lote</p>
                    <p className="mt-2 font-display text-3xl font-semibold text-slate-50">{purchaseDraftQuantity}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Total calculado pela grade informada.</p>
                  </div>
                </div>
                {selectedProduct ? (
                  <div className="space-y-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-50">Distribuição por grade</p>
                        <p className="mt-1 text-sm text-slate-400">Informe quanto entrou em cada tamanho para evitar recebimento genérico.</p>
                      </div>
                      <Badge variant="outline">{selectedProduct.variants.length} grades</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {(purchaseDraft.sizeBreakdown ?? []).map((entry) => (
                        <div className="panel-block rounded-[18px] p-3" key={entry.size}>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">{entry.size}</p>
                          <Input
                            className="mt-3"
                            min={0}
                            onChange={(event) => handleSizeBreakdownChange(entry.size, Number(event.target.value) || 0)}
                            type="number"
                            value={entry.quantity}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <select
                  className="native-select h-11 text-sm"
                  onChange={(event) =>
                    setPurchaseDraft((current) => ({ ...current, status: event.target.value as PurchaseCreateInput["status"] }))
                  }
                  value={purchaseDraft.status ?? "aberta"}
                >
                  <option value="aberta">Aberta</option>
                  <option value="conferida">Conferida</option>
                  <option value="recebida">Recebida</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="premium-tile rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fornecedor</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{selectedSupplierName ?? "Selecione um fornecedor"}</p>
                </div>
                <div className="premium-tile rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Produto</p>
                  <p className="mt-2 text-sm font-semibold text-slate-50">{selectedProductName ?? "Selecione um produto"}</p>
                </div>
              </div>
              <div className="premium-tile rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total estimado</p>
                <p className="mt-2 font-display text-3xl font-semibold text-slate-50">{formatCurrency(purchasePreviewTotal)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Quantidade {purchaseDraftQuantity} • status inicial {purchaseDraft.status ?? "aberta"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!suppliers.length || !products.length} onClick={() => void handleCreatePurchase()}>
                  Criar compra
                </Button>
                <Button onClick={() => setPurchaseDraft(createEmptyPurchaseDraft())} variant="outline">
                  Limpar
                </Button>
                {!suppliers.length ? (
                  <Link className={buttonVariants({ variant: "outline" })} to="/fornecedores">
                    Criar fornecedor
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <SupplierPerformancePanel items={supplierPerformance} />
          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Excecoes de lote</CardTitle>
              <CardDescription>Recebimentos concluidos que ainda podem pedir reabertura controlada.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="premium-tile rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lotes recebidos</p>
                <p className="mt-2 font-display text-3xl font-semibold text-slate-50">{receivedCount}</p>
                <p className="mt-2 text-sm text-slate-400">Podem ser reabertos para conferência quando surgir divergencia.</p>
              </div>
              <div className="premium-tile rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fluxo de excecao</p>
                <p className="mt-2 text-sm font-semibold text-slate-50">{receivedCount > 0 ? "Reabertura controlada disponivel no proprio card da compra." : "Sem lote finalizado pedindo excecao agora."}</p>
                <p className="mt-2 text-sm text-slate-400">Isso evita abrir telas extras quando o lote precisa voltar para conferência.</p>
              </div>
            </CardContent>
          </Card>
          <RecentAreaAuditPanel
            area="Compras"
            description="Recebimentos, conferências e resumos operacionais de lote."
            emptyMessage="As proximas acoes de compra vao aparecer aqui."
            title="Últimas acoes de abastecimento"
          />
        </div>
      </div>
    </div>
  );
}

