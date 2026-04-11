import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ScanLine, ShoppingBag } from "lucide-react";
import { buildRecentSaleHistory, buildThermalPreview, filterPdvProducts } from "@/features/pdv/pdv.service";
import { buildSalePrintPreviewForTemplate, openPrintPreviewWithOptions } from "@/features/printing/printing.service";
import { getSectorLabel } from "@/features/products/product.service";
import { appRepository } from "@/repositories/app-repository";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { PdvCart } from "@/components/pdv/pdv-cart";
import { PdvCustomerPanel } from "@/components/pdv/pdv-customer-panel";
import { PdvHistoryPanel } from "@/components/pdv/pdv-history-panel";
import { ProductPicker } from "@/components/pdv/product-picker";
import { ThermalPreviewPanel } from "@/components/pdv/thermal-preview-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { ResultLimitControl } from "@/components/shared/result-limit-control";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers, useProducts, useSales, useSettingsSnapshot } from "@/hooks/use-app-data";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { hasActionAccessForProfile, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { formatCurrency } from "@/lib/utils";
import { useAppShellStore } from "@/stores/app-shell-store";
import { usePdvStore } from "@/stores/pdv-store";
import type { CartItem, OperationFocus, PaymentMethod, Product, Sale } from "@/types/domain";

const focusModes: OperationFocus[] = ["geral", "calcados", "roupas"];
const PDV_PRODUCT_BASE_LIMIT = 6;
const PDV_PRODUCT_STEP = 6;

function getUiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return fallback;
}

export default function PdvPage() {
  const { data: products, loading: loadingProducts, reload: reloadProducts } = useProducts();
  const { data: customers } = useCustomers();
  const { data: sales, reload: reloadSales } = useSales();
  const { data: settings } = useSettingsSnapshot();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const setOperationFocus = useAppShellStore((state) => state.setOperationFocus);
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PDV_PRODUCT_BASE_LIMIT);
  const [isFinishingSale, setIsFinishingSale] = useState(false);
  const [saleFeedback, setSaleFeedback] = useState<string | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const cart = usePdvStore((state) => state.cart);
  const customerId = usePdvStore((state) => state.customerId);
  const discount = usePdvStore((state) => state.discount);
  const paymentMethods = usePdvStore((state) => state.paymentMethods);
  const addItem = usePdvStore((state) => state.addItem);
  const clearCart = usePdvStore((state) => state.clearCart);
  const removeItem = usePdvStore((state) => state.removeItem);
  const setCustomerId = usePdvStore((state) => state.setCustomerId);
  const setDiscount = usePdvStore((state) => state.setDiscount);
  const togglePaymentMethod = usePdvStore((state) => state.togglePaymentMethod);
  const updateQuantity = usePdvStore((state) => state.updateQuantity);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart]);
  const total = Math.max(subtotal - discount, 0);
  const filteredProducts = useMemo(() => filterPdvProducts(products ?? [], query, operationFocus), [products, query, operationFocus]);
  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleProductCount), [filteredProducts, visibleProductCount]);
  const saleHistory = buildRecentSaleHistory(sales ?? [], customers ?? []);
  const thermalPreview = buildThermalPreview(cart, total);
  const productVisuals = useMemo(
    () =>
      Object.fromEntries(
        (products ?? []).map((product) => [
          product.id,
          { imageHint: product.imageHint, imageDataUrl: product.imageDataUrl, sector: product.sector, name: product.name }
        ])
      ),
    [products]
  );
  const quickProducts = filteredProducts.slice(0, 4);
  const selectedCustomer = useMemo(() => (customers ?? []).find((customer) => customer.id === customerId) ?? null, [customerId, customers]);
  const cartItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const ticketProjected = cartItemsCount > 0 ? total / cartItemsCount : 0;
  const printPolicyLabel = settings
    ? settings.salePrintBehavior === "auto"
      ? `PDV abre o diálogo do Windows em ${settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm"}`
      : settings.salePrintBehavior === "preview"
        ? `PDV abre prévia em ${settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm"}`
        : "PDV fecha a venda sem abrir impressão"
    : "Carregando política de impressão";
  const activeLocalUser = settings ? resolveActiveLocalUserProfile(settings.localUsers, settings.activeLocalUserId) : null;
  const canApplyDiscount = hasActionAccessForProfile(activeLocalUser, "pdv_discount", settings?.currentUserRole ?? "operador");

  useEffect(() => {
    if (!canApplyDiscount && discount > 0) {
      setDiscount(0);
    }
  }, [canApplyDiscount, discount, setDiscount]);

  useEffect(() => {
    setVisibleProductCount(PDV_PRODUCT_BASE_LIMIT);
  }, [query, operationFocus, products?.length]);

  function openSalePrint(
    salePayload: {
      id: string;
      customerId?: string;
      subtotal: number;
      discount: number;
      total: number;
      paymentMethods: PaymentMethod[];
      createdAt: string;
      items: Array<CartItem | Sale["items"][number]>;
    },
    options: { templateId?: string; autoPrint?: boolean } = {}
  ) {
    if (!settings || !products) {
      setSaleError("As configurações de impressão ainda não foram carregadas.");
      return false;
    }

    const templateId = options.templateId ?? settings.defaultSalePrintTemplate;
    const preview = buildSalePrintPreviewForTemplate({
      templateId,
      settings,
      products,
      customers: customers ?? [],
      sale: {
        ...salePayload,
        items: salePayload.items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      }
    });

    const opened = openPrintPreviewWithOptions(preview, { autoPrint: options.autoPrint ?? false });
    if (!opened) {
      setSaleError(`A janela de ${options.autoPrint ? "impressão" : "prévia"} foi bloqueada. Libere pop-up para usar o cupom local.`);
      return false;
    }

    return true;
  }

  function handleAddProduct(product: Product) {
    const firstVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
    if (!firstVariant) {
      setSaleError(`O produto ${product.name} não possui grade disponível para venda.`);
      return;
    }

    setSaleError(null);
    setSaleFeedback(null);
    addItem({
      productId: product.id,
      name: product.name,
      quantity: 1,
      size: firstVariant.size,
      unitPrice: product.promotionalPrice ?? product.salePrice
    });
  }

  async function handleFinishSale() {
    setSaleError(null);
    setSaleFeedback(null);

    if (!cart.length) {
      setSaleError("Adicione itens antes de finalizar a venda.");
      return;
    }

    if (!paymentMethods.length) {
      setSaleError("Selecione ao menos uma forma de pagamento.");
      return;
    }

    setIsFinishingSale(true);
    try {
      const sale = await appRepository.createSale({
        customerId,
        subtotal,
        discount,
        total,
        paymentMethods,
        items: cart
      });

      clearCart();
      reloadProducts();
      reloadSales();
      setQuery("");
      const currentPrintBehavior = settings?.salePrintBehavior ?? "disabled";
      const currentPrintTemplate = settings?.defaultSalePrintTemplate ?? "tpl-58";
      const opened =
        currentPrintBehavior !== "disabled"
          ? openSalePrint(
              { ...sale, items: sale.items },
              {
                templateId: currentPrintTemplate,
                autoPrint: currentPrintBehavior === "auto"
              }
            )
          : false;
      const timeLabel = new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSaleFeedback(
        opened
          ? currentPrintBehavior === "auto"
            ? `Venda ${sale.id} finalizada com sucesso às ${timeLabel}. O diálogo de impressão do Windows foi aberto no padrão da loja.`
            : `Venda ${sale.id} finalizada com sucesso às ${timeLabel}. A prévia de impressão foi aberta no padrão da loja.`
          : `Venda ${sale.id} finalizada com sucesso às ${timeLabel}.`
      );
    } catch (error) {
      setSaleError(getUiErrorMessage(error, "Não foi possível finalizar a venda."));
    } finally {
      setIsFinishingSale(false);
    }
  }

  function handlePreviewCurrentReceipt() {
    if (!cart.length) {
      setSaleError("Adicione itens ao carrinho para testar o cupom do PDV.");
      return;
    }

    setSaleError(null);
    setSaleFeedback(null);
    const previewOpened = openSalePrint({
      id: "PREVIEW-PDV",
      customerId,
      subtotal,
      discount,
      total,
      paymentMethods,
      createdAt: new Date().toISOString(),
      items: cart
    });
    if (previewOpened) {
      setSaleFeedback("Prévia do cupom aberta com base na configuração atual da loja.");
    }
  }

  function handlePrintCurrentReceipt(templateId: "tpl-58" | "tpl-80") {
    if (!cart.length) {
      setSaleError("Adicione itens ao carrinho para imprimir o cupom do PDV.");
      return;
    }

    setSaleError(null);
    setSaleFeedback(null);
    const opened = openSalePrint(
      {
        id: "PRINT-PDV",
        customerId,
        subtotal,
        discount,
        total,
        paymentMethods,
        createdAt: new Date().toISOString(),
        items: cart
      },
      { templateId, autoPrint: true }
    );

    if (opened) {
      setSaleFeedback(`Diálogo de impressão do Windows aberto para ${templateId === "tpl-80" ? "80 mm" : "58 mm"}.`);
    }
  }

  function handleClearCart() {
    clearCart();
  }

  function handleBarcodeAction() {
    setSaleError(null);
    setSaleFeedback(null);

    const scannedCode = window.prompt("Escaneie ou digite o código de barras, SKU ou código interno:");
    if (scannedCode === null) {
      queryInputRef.current?.focus();
      return;
    }

    const normalizedCode = scannedCode.trim();
    if (!normalizedCode) {
      setSaleError("Informe um código para localizar o produto no PDV.");
      queryInputRef.current?.focus();
      return;
    }

    const exactMatch = (products ?? []).find((product) =>
      [product.barcode, product.sku, product.internalCode].some((value) => value.trim().toLowerCase() === normalizedCode.toLowerCase())
    );

    if (exactMatch) {
      handleAddProduct(exactMatch);
      setQuery(normalizedCode);
      setSaleFeedback(`${exactMatch.name} localizado pelo código e enviado para o carrinho.`);
      return;
    }

    setQuery(normalizedCode);
    queryInputRef.current?.focus();
    queryInputRef.current?.select();
    setSaleError(`Nenhum produto bateu exatamente com "${normalizedCode}". O filtro foi preenchido para refinamento manual.`);
  }

  useKeyboardShortcuts([
    {
      key: "b",
      meta: true,
      handler: handleClearCart
    },
    {
      key: "f9",
      handler: () => {
        if (!isFinishingSale) {
          void handleFinishSale();
        }
      }
    }
  ]);

  if (loadingProducts || !products || !customers || !sales || !settings) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        compact
        actions={
          <>
            <Badge variant="outline">F9 finaliza a venda</Badge>
            <Button onClick={handleBarcodeAction} type="button">
              <ScanLine className="h-4 w-4" />
              Ler código de barras
            </Button>
          </>
        }
        badge="Fluxo otimizado para teclado"
        description="Caixa direto para buscar, adicionar, fechar e imprimir sem blocos sobrando nem leitura apertada."
        eyebrow="PDV"
        title="Venda rápida e sem atrito"
      />

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
            <Input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, SKU, código de barras ou código interno"
              ref={queryInputRef}
              value={query}
            />
            <div className="text-[13px] font-medium text-slate-300">Setor em foco: {getSectorLabel(operationFocus).toLowerCase()}.</div>
            <Badge className="xl:col-span-2 2xl:col-span-1" variant="outline">{printPolicyLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {focusModes.map((mode) => (
                <Button key={mode} onClick={() => setOperationFocus(mode)} size="sm" variant={operationFocus === mode ? "default" : "outline"}>
                  {getSectorLabel(mode)}
                </Button>
              ))}
            </div>
            <Badge variant="secondary">{filteredProducts.length} itens no recorte</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
            <div className="panel-block rounded-[18px] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Carrinho</p>
              <p className="mt-1 text-[16px] font-semibold text-slate-50">{cartItemsCount} unidade(s)</p>
              <p className="mt-1 text-[12px] text-slate-400">{cart.length} produto(s) na venda atual</p>
            </div>
            <div className="panel-block rounded-[18px] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Cliente</p>
              <p className="mt-1 truncate text-[16px] font-semibold text-slate-50">{selectedCustomer?.name ?? "Consumidor final"}</p>
              <p className="mt-1 truncate text-[12px] text-slate-400">{selectedCustomer?.whatsapp || selectedCustomer?.phone || "Sem vínculo de carteira"}</p>
            </div>
            <div className="panel-block rounded-[18px] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Subtotal</p>
              <p className="mt-1 text-[16px] font-semibold text-slate-50">{formatCurrency(subtotal)}</p>
              <p className="mt-1 text-[12px] text-slate-400">Ticket projetado {formatCurrency(ticketProjected)}</p>
            </div>
            <div className="panel-block rounded-[18px] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Fechamento</p>
              <p className="mt-1 text-[16px] font-semibold text-slate-50">{paymentMethods.length ? `${paymentMethods.length} método(s)` : "Aguardando pagamento"}</p>
              <p className="mt-1 text-[12px] text-slate-400">{canApplyDiscount ? "Desconto liberado" : "Desconto restrito por perfil"}</p>
            </div>
          </div>

          {saleError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/14 bg-[linear-gradient(180deg,rgba(38,34,42,0.98),rgba(26,23,30,0.98))] px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,248,228,0.08),0_18px_34px_-30px_rgba(0,0,0,0.72)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">Atalhos do balcão</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-50">Clique em um item abaixo para puxar o produto mais rápido para a venda.</p>
            </div>
            <Badge variant="outline">{quickProducts.length} atalhos</Badge>
          </div>

          {quickProducts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {quickProducts.map((product) => (
                <button
                  className="premium-tile rounded-[18px] p-3 text-left transition hover:border-slate-400/24"
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  type="button"
                >
                  <ProductImagePlaceholder compact imageDataUrl={product.imageDataUrl} imageHint={product.imageHint} name={product.name} sector={product.sector} />
                  <div className="mt-3 space-y-1">
                    <p className="text-[14px] font-semibold text-slate-50">{product.name}</p>
                    <p className="text-[12px] text-slate-400">{product.sku} • {product.variants[0]?.size ?? "grade"}</p>
                    <p className="text-[11px] text-[color:rgba(214,190,142,0.82)]">{formatCurrency(product.promotionalPrice ?? product.salePrice)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state-box px-4 py-5 text-center text-[13px]">
              Nenhum atalho foi encontrado neste recorte. Ajuste a busca ou troque o setor para recuperar produtos do balcão.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.9fr)] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.92fr)]">
        <div className="space-y-5">
          <PdvCustomerPanel customerId={customerId} customers={customers} onCustomerChange={setCustomerId} />
          <ProductPicker onAdd={handleAddProduct} products={visibleProducts} />
          <ResultLimitControl
            baseCount={PDV_PRODUCT_BASE_LIMIT}
            itemLabel="produtos"
            onReset={() => setVisibleProductCount(PDV_PRODUCT_BASE_LIMIT)}
            onShowMore={() => setVisibleProductCount((current) => Math.min(current + PDV_PRODUCT_STEP, filteredProducts.length))}
            totalCount={filteredProducts.length}
            visibleCount={visibleProducts.length}
          />
          <Tabs defaultValue="historico">
            <TabsList>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="cupom">Prévia térmica</TabsTrigger>
            </TabsList>
            <TabsContent value="historico">
              <PdvHistoryPanel items={saleHistory} />
            </TabsContent>
            <TabsContent value="cupom">
              <ThermalPreviewPanel lines={thermalPreview} />
            </TabsContent>
          </Tabs>
        </div>

        <PdvCart
          canEditDiscount={canApplyDiscount}
          cart={cart}
          discount={discount}
          discountLockedMessage={!canApplyDiscount ? "Desconto manual liberado somente para administrador ou super admin." : undefined}
          isFinishing={isFinishingSale}
          onClear={handleClearCart}
          onDiscountChange={setDiscount}
          onFinishSale={handleFinishSale}
          onPreviewPrint={handlePreviewCurrentReceipt}
          onQuantityChange={updateQuantity}
          onRemove={removeItem}
          onTogglePaymentMethod={togglePaymentMethod}
          paymentMethods={paymentMethods}
          printPolicyLabel={printPolicyLabel}
          printActions={[
            { id: "print-58", label: "Imprimir 58 mm", onClick: () => handlePrintCurrentReceipt("tpl-58") },
            { id: "print-80", label: "Imprimir 80 mm", onClick: () => handlePrintCurrentReceipt("tpl-80") }
          ]}
          productVisuals={productVisuals}
          saleFeedback={saleFeedback}
          subtotal={subtotal}
          total={total}
        />
      </div>
    </div>
  );
}
