import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { CartItem, PaymentMethod, ProductSector } from "@/types/domain";

const paymentMethods: PaymentMethod[] = ["Pix", "Cartao", "Dinheiro", "Crediario"];

interface PdvCartProps {
  cart: CartItem[];
  productVisuals: Record<string, { imageHint: string; sector: ProductSector; name: string }>;
  discount: number;
  subtotal: number;
  total: number;
  paymentMethods: PaymentMethod[];
  isFinishing?: boolean;
  saleFeedback?: string | null;
  printPolicyLabel: string;
  onDiscountChange: (value: number) => void;
  onRemove: (productId: string, size: string) => void;
  onQuantityChange: (productId: string, size: string, quantity: number) => void;
  onTogglePaymentMethod: (method: PaymentMethod) => void;
  onClear: () => void;
  onPreviewPrint: () => void;
  onFinishSale: () => void;
}

export function PdvCart({
  cart,
  productVisuals,
  discount,
  subtotal,
  total,
  paymentMethods: selectedMethods,
  isFinishing,
  saleFeedback,
  printPolicyLabel,
  onDiscountChange,
  onRemove,
  onQuantityChange,
  onTogglePaymentMethod,
  onClear,
  onPreviewPrint,
  onFinishSale
}: PdvCartProps) {
  const canFinish = cart.length > 0 && selectedMethods.length > 0 && !isFinishing;
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="executive-panel sticky top-20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Carrinho da venda</CardTitle>
            <CardDescription>Caixa direto para balcão e fechamento rápido.</CardDescription>
          </div>
          <Badge variant="secondary">{itemsCount} itens</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2.5">
          {cart.length === 0 ? (
            <div className="empty-state-box px-4 py-4 text-center text-[13px]">
              Nenhum item no carrinho. Use os atalhos rápidos ou pressione F2 para manter o foco no PDV.
            </div>
          ) : (
            cart.map((item) => (
              <div className="panel-block rounded-[16px] p-3" key={`${item.productId}-${item.size}`}>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <ProductImagePlaceholder
                      className="w-[104px]"
                      compact
                      imageHint={productVisuals[item.productId]?.imageHint}
                      name={productVisuals[item.productId]?.name ?? item.name}
                      sector={productVisuals[item.productId]?.sector}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-950">{item.name}</p>
                      <p className="text-[11px] text-slate-600">Numeração {item.size}</p>
                    </div>
                  </div>
                  <Button className="h-8 w-8" onClick={() => onRemove(item.productId, item.size)} size="icon" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 rounded-[16px] border border-border/75 bg-white/85 px-1.5 py-1">
                    <Button className="h-7 w-7" onClick={() => onQuantityChange(item.productId, item.size, Math.max(1, item.quantity - 1))} size="icon" type="button" variant="ghost">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      className="h-7 w-12 border-0 bg-transparent px-0 text-center text-[13px] font-semibold shadow-none"
                      min={1}
                      onChange={(event) => onQuantityChange(item.productId, item.size, Number(event.target.value))}
                      type="number"
                      value={item.quantity}
                    />
                    <Button className="h-7 w-7" onClick={() => onQuantityChange(item.productId, item.size, item.quantity + 1)} size="icon" type="button" variant="ghost">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Total item</p>
                    <p className="font-semibold text-slate-950">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[20px] bg-slate-950 p-3.5 text-white shadow-[0_20px_36px_-28px_rgba(15,23,42,0.6)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Pagamento</p>
            <Badge variant="secondary">{selectedMethods.length} ativo(s)</Badge>
          </div>
          <div className="mt-2.5 grid gap-2">
            {paymentMethods.map((method) => {
              const active = selectedMethods.includes(method);
              return (
                <button
                  className={
                    active
                      ? "flex h-10 items-center justify-between rounded-xl border border-white/20 bg-white/70 px-3.5 text-left font-semibold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:bg-white/80"
                      : "flex h-10 items-center justify-between rounded-xl border border-white/10 bg-white/6 px-3.5 text-left font-medium text-slate-300 transition hover:border-white/18 hover:bg-white/10 hover:text-white"
                  }
                  key={method}
                  onClick={() => onTogglePaymentMethod(method)}
                  type="button"
                >
                  <span>{method}</span>
                  {active ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] border border-white/70 bg-secondary/30 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="rounded-2xl bg-white/85 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
            {printPolicyLabel}
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold text-slate-950">{formatCurrency(subtotal)}</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-900" htmlFor="discount-input">
              Desconto
            </label>
            <Input
              className="h-10 text-[14px] font-medium"
              id="discount-input"
              min={0}
              onChange={(event) => onDiscountChange(Number(event.target.value))}
              type="number"
              value={discount}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.16em] text-slate-500">Total</span>
            <span className="font-display text-[22px] font-semibold text-slate-950">{formatCurrency(total)}</span>
          </div>
        </div>

        {saleFeedback ? (
          <div className="system-alert system-alert--success">
            {saleFeedback}
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button className="h-10" onClick={onClear} variant="outline">
            Limpar
          </Button>
          <Button className="h-10" onClick={onPreviewPrint} type="button" variant="outline">
            Testar cupom
          </Button>
        </div>

        <div className="grid gap-2.5">
          <Button className="h-11 text-[14px]" disabled={!canFinish} onClick={onFinishSale}>
            {isFinishing ? "Finalizando..." : "Finalizar venda"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
