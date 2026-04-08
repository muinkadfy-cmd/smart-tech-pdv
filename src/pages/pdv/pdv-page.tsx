import { useMemo, useState } from "react";
import { AlertTriangle, ScanLine } from "lucide-react";
import { buildPdvSummary, buildRecentSaleHistory, buildThermalPreview, filterPdvProducts } from "@/features/pdv/pdv.service";
import { buildSalePrintPreview, openPrintPreviewWithOptions } from "@/features/printing/printing.service";
import { getSectorLabel } from "@/features/products/product.service";
import { appRepository } from "@/repositories/app-repository";
import { ModuleHeader } from "@/components/shared/module-header";
import { PdvCart } from "@/components/pdv/pdv-cart";
import { PdvCustomerPanel } from "@/components/pdv/pdv-customer-panel";
import { PdvHistoryPanel } from "@/components/pdv/pdv-history-panel";
import { ProductPicker } from "@/components/pdv/product-picker";
import { PdvSummaryCards } from "@/components/pdv/pdv-summary-cards";
import { ThermalPreviewPanel } from "@/components/pdv/thermal-preview-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Input } from "@/components/ui/input";
import { useCustomers, useProducts, useSales, useSettingsSnapshot } from "@/hooks/use-app-data";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAppShellStore } from "@/stores/app-shell-store";
import { usePdvStore } from "@/stores/pdv-store";
import type { CartItem, OperationFocus, PaymentMethod, Product, Sale } from "@/types/domain";

const focusModes: OperationFocus[] = ["geral", "calcados", "roupas"];

export default function PdvPage() {
  const { data: products, loading: loadingProducts, reload: reloadProducts } = useProducts();
  const { data: customers } = useCustomers();
  const { data: sales, reload: reloadSales } = useSales();
  const { data: settings } = useSettingsSnapshot();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const setOperationFocus = useAppShellStore((state) => state.setOperationFocus);
  const [query, setQuery] = useState("");
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
  const selectedCustomer = customers?.find((customer) => customer.id === customerId);
  const filteredProducts = filterPdvProducts(products ?? [], query, operationFocus).slice(0, 9);
  const summaryCards = buildPdvSummary(subtotal, total, selectedCustomer, cart.reduce((sum, item) => sum + item.quantity, 0));
  const saleHistory = buildRecentSaleHistory(sales ?? [], customers ?? []);
  const thermalPreview = buildThermalPreview(cart, total);
  const productVisuals = useMemo(
    () =>
      Object.fromEntries(
        (products ?? []).map((product) => [
          product.id,
          { imageHint: product.imageHint, sector: product.sector, name: product.name }
        ])
      ),
    [products]
  );
  const quickProducts = filteredProducts.slice(0, 4);
  const printPolicyLabel = settings
    ? settings.salePrintBehavior === "auto"
      ? `PDV imprime ${settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm"} automaticamente`
      : settings.salePrintBehavior === "preview"
        ? `PDV abre preview em ${settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm"}`
        : "PDV fecha venda sem abrir impressao"
    : "Carregando politica de impressao";

  function openSalePreview(salePayload: { id: string; customerId?: string; subtotal: number; discount: number; total: number; paymentMethods: PaymentMethod[]; createdAt: string; items: Array<CartItem | Sale["items"][number]> }) {
    if (!settings || !products) {
      setSaleError("Configuracoes de impressao ainda nao foram carregadas.");
      return false;
    }

    const preview = buildSalePrintPreview({
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

    const opened = openPrintPreviewWithOptions(preview, { autoPrint: settings.salePrintBehavior === "auto" });
    if (!opened) {
      setSaleError("O preview de impressao foi bloqueado. Libere pop-up para usar o cupom local.");
      return false;
    }

    return true;
  }

  function handleAddProduct(product: Product) {
    const firstVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
    if (!firstVariant) {
      setSaleError(`O produto ${product.name} nao possui grade disponivel para venda.`);
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
      const opened = settings?.salePrintBehavior !== "disabled" ? openSalePreview({ ...sale, items: sale.items }) : false;
      const timeLabel = new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setSaleFeedback(
        opened
          ? `Venda ${sale.id} finalizada com sucesso em ${timeLabel}. Preview de impressao aberto no padrao da loja.`
          : `Venda ${sale.id} finalizada com sucesso em ${timeLabel}.`
      );
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : "Nao foi possivel finalizar a venda.");
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
    const previewOpened = openSalePreview({
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
      setSaleFeedback("Preview do cupom do carrinho aberto com base na configuracao atual da loja.");
    }
  }

  useKeyboardShortcuts([
    {
      key: "f2",
      handler: () => filteredProducts[0] && handleAddProduct(filteredProducts[0])
    },
    {
      key: "b",
      meta: true,
      handler: clearCart
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
    return null;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        actions={
          <>
            <Badge variant="outline">F2 adiciona item rapido</Badge>
            <Badge variant="outline">F9 finaliza venda</Badge>
            <Button>
              <ScanLine className="h-4 w-4" />
              Ler codigo de barras
            </Button>
          </>
        }
        badge="Fluxo otimizado para teclado"
        description="PDV único para a loja inteira, mas com foco operacional por setor para o atendente não se perder entre roupas e calçados."
        eyebrow="PDV"
        title="Venda rapida e sem atrito"
      />

      <div className="section-rule pt-4">
        <PdvSummaryCards cards={summaryCards} />
      </div>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="space-y-4 p-4">
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
          <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, SKU, codigo de barras ou codigo interno" value={query} />
            <div className="text-[13px] text-slate-600">Mostrando {filteredProducts.length} itens em {getSectorLabel(operationFocus).toLowerCase()}.</div>
          </div>
          {saleError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Acesso rápido do balcão</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Clique em um item para puxar o produto mais rápido para a venda.</p>
            </div>
            <Badge variant="outline">{quickProducts.length} atalhos</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickProducts.map((product) => (
              <button
                className="panel-block rounded-[18px] p-3 text-left transition hover:border-slate-300 hover:bg-secondary/30"
                key={product.id}
                onClick={() => handleAddProduct(product)}
                type="button"
              >
                <ProductImagePlaceholder compact imageHint={product.imageHint} name={product.name} sector={product.sector} />
                <div className="mt-3">
                  <p className="text-[14px] font-semibold text-slate-950">{product.name}</p>
                  <p className="mt-1 text-[12px] text-slate-600">{product.sku} • {product.variants[0]?.size ?? "grade"}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Leitura do caixa</p>
            <p className="text-[15px] font-semibold text-slate-950">Busca, foco por setor e fechamento estão mais claros para o operador não se perder.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Setor ativo</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{getSectorLabel(operationFocus)}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Forma de uso</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Teclado + clique</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Impressão</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{printPolicyLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 2xl:grid-cols-[1.5fr_0.88fr]">
        <div className="space-y-5">
          <PdvCustomerPanel customerId={customerId} customers={customers} onCustomerChange={setCustomerId} />
          <ProductPicker onAdd={handleAddProduct} products={filteredProducts} />
          <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
            <PdvHistoryPanel items={saleHistory} />
            <ThermalPreviewPanel lines={thermalPreview} />
          </div>
        </div>

        <PdvCart
          cart={cart}
          discount={discount}
          isFinishing={isFinishingSale}
          onClear={clearCart}
          onDiscountChange={setDiscount}
          onFinishSale={handleFinishSale}
          onPreviewPrint={handlePreviewCurrentReceipt}
          onQuantityChange={updateQuantity}
          onRemove={removeItem}
          onTogglePaymentMethod={togglePaymentMethod}
          paymentMethods={paymentMethods}
          printPolicyLabel={printPolicyLabel}
          productVisuals={productVisuals}
          saleFeedback={saleFeedback}
          subtotal={subtotal}
          total={total}
        />
      </div>
    </div>
  );
}
