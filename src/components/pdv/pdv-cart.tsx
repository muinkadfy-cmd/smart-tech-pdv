import type { ReactNode } from "react";
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CartItem, PaymentMethod, ProductSector } from "@/types/domain";

const paymentMethods: PaymentMethod[] = ["Pix", "Cartao", "Dinheiro", "Crediario"];

interface PdvCartPrintAction {
  id: string;
  label: string;
  onClick: () => void;
}

interface PdvCartProps {
  cart: CartItem[];
  productVisuals: Record<string, { imageHint: string; imageDataUrl?: string; sector: ProductSector; name: string }>;
  discount: number;
  subtotal: number;
  total: number;
  paymentMethods: PaymentMethod[];
  isFinishing?: boolean;
  saleFeedback?: string | null;
  printPolicyLabel: string;
  canEditDiscount?: boolean;
  discountLockedMessage?: string;
  compact?: boolean;
  compactMode?: "stacked" | "horizontal";
  sticky?: boolean;
  className?: string;
  compactLead?: ReactNode;
  onDismiss?: () => void;
  continueLabel?: string;
  printActions?: PdvCartPrintAction[];
  onContinue?: () => void;
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
  canEditDiscount = true,
  discountLockedMessage,
  compact = false,
  compactMode = "stacked",
  sticky = true,
  className,
  compactLead,
  onDismiss,
  continueLabel = "Adicionar produtos",
  printActions = [],
  onContinue,
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
  const compactItemImageClass = compact ? "w-[52px]" : "w-[104px]";
  const isHorizontalCompact = compact && compactMode === "horizontal";

  return (
    <Card
      className={cn(
        compact ? "executive-panel flex max-h-[calc(100vh-40px)] flex-col overflow-hidden" : "executive-panel",
        !compact && sticky && "sticky top-24",
        className
      )}
    >
      <CardHeader className={cn(compact ? "border-b border-[rgba(201,168,111,0.12)] px-2.5 pb-1.5 pt-2" : "pb-2") }>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className={cn(compact && "text-[13px] leading-4")}>{compact ? "Carrinho rápido" : "Carrinho da venda"}</CardTitle>
            <CardDescription className={cn(compact && "mt-0.5 text-[10px] leading-4")}>
              {compact ? "Feche, imprima ou volte para adicionar mais itens." : "Resumo final para fechar, imprimir e manter o caixa fluido no balcão."}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className={cn(compact && "h-5 rounded-full px-2 text-[9px]")} variant="secondary">
              {itemsCount} itens
            </Badge>
            {compact && onDismiss ? (
              <Button aria-label="Fechar carrinho rápido" className="h-6 w-6" onClick={onDismiss} size="icon" type="button" variant="ghost">
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2")}>
        {compactLead ? <div className={cn("premium-tile rounded-[16px] p-3", compact && "rounded-[12px] p-2")}>{compactLead}</div> : null}

        {!compact ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="panel-block rounded-[16px] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Itens</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-50">{itemsCount} unidade(s)</p>
            </div>
            <div className="panel-block rounded-[16px] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Pagamento</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-50">{selectedMethods.length ? selectedMethods.length : 0} método(s)</p>
            </div>
            <div className="panel-block rounded-[16px] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Fechamento</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-50">{canFinish ? "Pronto para vender" : "Aguardando dados"}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-[12px] border border-[rgba(201,168,111,0.1)] bg-[rgba(255,255,255,0.025)] px-2 py-1">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Itens no carrinho</span>
            <span className="text-[10px] font-medium text-slate-300">{cart.length} produto(s)</span>
          </div>
        )}

        <div className={cn("min-h-0 flex-1", isHorizontalCompact && "grid min-h-0 grid-cols-[minmax(0,1fr)_184px] gap-2.5")}>
          <div className={cn("space-y-2.5", compact && "min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1")}>
            {cart.length === 0 ? (
              <div className="empty-state-box px-4 py-5 text-center text-[13px]">
                Nenhum item no carrinho. Clique em um produto para montar a venda e liberar impressão, desconto e fechamento.
              </div>
            ) : (
              cart.map((item) => (
                <div className={cn("premium-tile rounded-[16px] p-3", compact && "rounded-[14px] p-2.5")} key={`${item.productId}-${item.size}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <ProductImagePlaceholder
                        className={compactItemImageClass}
                        compact
                        imageDataUrl={productVisuals[item.productId]?.imageDataUrl}
                        imageHint={productVisuals[item.productId]?.imageHint}
                        name={productVisuals[item.productId]?.name ?? item.name}
                        sector={productVisuals[item.productId]?.sector}
                      />
                      <div className="min-w-0 pt-0.5">
                        <p className={cn("truncate font-semibold text-slate-50", compact ? "text-[11px] leading-4" : "text-[13px]")}>{item.name}</p>
                        <p className={cn("text-slate-400", compact ? "text-[9px]" : "text-[11px]")}>Numeração {item.size}</p>
                        {!compact ? <p className="mt-1 text-[11px] text-[color:rgba(214,190,142,0.82)]">Unitário {formatCurrency(item.unitPrice)}</p> : null}
                      </div>
                    </div>
                    <Button className={cn(compact ? "h-6 w-6" : "h-8 w-8")} onClick={() => onRemove(item.productId, item.size)} size="icon" type="button" variant="ghost">
                      <Trash2 className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className={cn("flex items-center gap-1 rounded-[12px] border border-[rgba(201,168,111,0.1)] bg-[linear-gradient(180deg,rgba(33,38,47,0.96),rgba(22,26,33,0.98))] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", compact && "px-1.5 py-1")}>
                      <Button className={cn(compact ? "h-5 w-5" : "h-6 w-6")} onClick={() => onQuantityChange(item.productId, item.size, Math.max(1, item.quantity - 1))} size="icon" type="button" variant="ghost">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        className={cn("border-0 bg-transparent px-0 text-center font-semibold text-slate-50 shadow-none", compact ? "h-5 w-8 text-[10px]" : "h-6 w-10 text-[12px]")}
                        min={1}
                        onChange={(event) => onQuantityChange(item.productId, item.size, Math.max(1, Number(event.target.value) || 1))}
                        type="number"
                        value={item.quantity}
                      />
                      <Button className={cn(compact ? "h-5 w-5" : "h-6 w-6")} onClick={() => onQuantityChange(item.productId, item.size, item.quantity + 1)} size="icon" type="button" variant="ghost">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className={cn("uppercase tracking-[0.16em] text-slate-400", compact ? "text-[8px]" : "text-[10px]")}>Total do item</p>
                      <p className={cn("font-semibold text-slate-50", compact ? "text-[12px]" : "text-[14px]")}>{formatCurrency(item.unitPrice * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={cn("space-y-2.5", isHorizontalCompact && "flex min-h-0 flex-col")}>
            <div className={cn("rounded-[20px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,1))] text-white shadow-[0_24px_36px_-28px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.04)]", compact ? "p-2" : "p-3.5")}>
              <div className="flex items-center justify-between gap-3">
                <p className={cn("uppercase tracking-[0.22em] text-slate-300", compact ? "text-[8px]" : "text-[10px]")}>Pagamento</p>
                <Badge className={cn(compact && "h-5 rounded-full px-2 text-[9px]")} variant="secondary">{selectedMethods.length} ativo(s)</Badge>
              </div>
              <div className={cn("mt-1.5 grid gap-1.5", compact ? "grid-cols-1" : "grid-cols-2")}>
                {paymentMethods.map((method) => {
                  const active = selectedMethods.includes(method);
                  return (
                    <button
                      className={
                        active
                          ? cn("flex items-center justify-between rounded-xl border border-white/14 bg-[rgba(255,255,255,0.06)] px-3 text-left font-semibold text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-[rgba(255,255,255,0.08)]", compact ? "h-7 px-2 text-[11px]" : "h-9 text-[13px]")
                          : cn("flex items-center justify-between rounded-xl border border-white/10 bg-white/8 px-3 text-left font-medium text-slate-300 transition hover:border-white/18 hover:bg-white/10 hover:text-white", compact ? "h-7 px-2 text-[11px]" : "h-9 text-[13px]")
                      }
                      key={method}
                      onClick={() => onTogglePaymentMethod(method)}
                      type="button"
                    >
                      <span>{method}</span>
                      {active ? <Check className={cn(compact ? "h-3 w-3" : "h-4 w-4")} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={cn("space-y-3 rounded-[20px] border border-[rgba(201,168,111,0.12)] bg-[linear-gradient(180deg,rgba(28,33,41,0.98),rgba(17,21,28,0.985))] text-slate-100 shadow-[0_24px_36px_-28px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]", compact ? "space-y-2 p-2.5" : "p-3.5")}>
              <div className={cn("rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] font-medium uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]", compact ? "px-2 py-1 text-[8px]" : "px-3 py-2 text-[10px]")}>{printPolicyLabel}</div>
              <div className={cn("flex items-center justify-between", compact ? "text-[11px]" : "text-[13px]")}>
                <span className="text-slate-400">Subtotal</span>
                <span className="font-semibold text-slate-50">{formatCurrency(subtotal)}</span>
              </div>
              <div className={cn(compact ? "space-y-1" : "space-y-1.5")}>
                <label className={cn("font-medium uppercase tracking-[0.12em] text-[color:rgba(214,190,142,0.82)]", compact ? "text-[9px]" : "text-[11px]")} htmlFor={compact ? "discount-input-compact" : "discount-input"}>
                  Desconto
                </label>
                <Input
                  className={cn("font-medium", compact ? "h-8 text-[12px]" : "h-10 text-[14px]")}
                  disabled={!canEditDiscount}
                  id={compact ? "discount-input-compact" : "discount-input"}
                  min={0}
                  onChange={(event) => onDiscountChange(Number(event.target.value))}
                  type="number"
                  value={discount}
                />
                {!canEditDiscount && discountLockedMessage ? <p className="text-[11px] text-slate-400">{discountLockedMessage}</p> : null}
              </div>
              <Separator className="bg-[rgba(201,168,111,0.14)]" />
              <div className="flex items-center justify-between">
                <span className={cn("uppercase tracking-[0.18em] text-slate-400", compact ? "text-[9px]" : "text-[11px]")}>Total</span>
                <span className={cn("font-display font-semibold text-slate-50", compact ? "text-[15px]" : "text-[22px]")}>{formatCurrency(total)}</span>
              </div>
            </div>

            {saleFeedback ? <div className="system-alert system-alert--success text-[12px]">{saleFeedback}</div> : null}

            {printActions.length > 0 ? (
              <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
                {printActions.map((action) => (
                  <Button className={cn(compact ? "h-8 text-[12px]" : "h-10")} key={action.id} onClick={action.onClick} type="button" variant="outline">
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
              <Button className={cn(compact ? "h-8 text-[12px]" : "h-10")} onClick={onClear} type="button" variant="outline">
                Limpar
              </Button>
              <Button className={cn(compact ? "h-8 text-[12px]" : "h-10")} onClick={onPreviewPrint} type="button" variant="outline">
                Prévia do cupom
              </Button>
              {compact && onContinue ? (
                <Button className="h-8 text-[12px]" onClick={onContinue} type="button" variant="secondary">
                  <ShoppingBag className="h-3 w-3" />
                  {continueLabel}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Button className={cn("disabled:cursor-not-allowed disabled:opacity-55", compact ? "h-9 text-[12px]" : "h-11 text-[14px]")} disabled={!canFinish} onClick={onFinishSale} type="button">
                {isFinishing ? "Finalizando..." : compact ? "Fechar venda" : "Finalizar venda"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
