import { Plus } from "lucide-react";
import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/domain";

interface ProductPickerProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

export function ProductPicker({ products, onAdd }: ProductPickerProps) {
  if (!products.length) {
    return (
      <Card className="executive-panel">
        <CardContent className="p-5">
          <div className="empty-state-box px-5 py-6 text-center text-[13px]">
            Nenhum produto apareceu neste filtro. Ajuste a busca, troque o setor ou use o código de barras para localizar mais rápido.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => {
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        const visibleSizes = product.variants.map((variant) => variant.size).filter(Boolean);
        const shownSizes = visibleSizes.slice(0, 4);
        const hiddenSizeCount = Math.max(visibleSizes.length - shownSizes.length, 0);
        const salePrice = product.promotionalPrice ?? product.salePrice;

        return (
          <Card className="executive-panel h-full transition hover:-translate-y-[1px]" key={product.id}>
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <button className="w-full text-left" onClick={() => onAdd(product)} type="button">
                <ProductImagePlaceholder className="h-24" imageDataUrl={product.imageDataUrl} imageHint={product.imageHint} name={product.name} sector={product.sector} />
              </button>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getSectorLabel(product.sector)}</Badge>
                  <Badge variant={product.status === "active" ? "success" : "outline"}>{product.status === "active" ? "Ativo" : "Inativo"}</Badge>
                  {totalStock <= 0 ? <Badge variant="destructive">Sem saldo</Badge> : null}
                </div>

                <div>
                  <p
                    className="text-[15px] font-semibold leading-5 text-slate-50"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {product.name}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">{product.sku} • {product.internalCode}</p>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="panel-block rounded-[18px] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Preço de venda</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="font-display text-[21px] font-semibold leading-none text-slate-50">{formatCurrency(salePrice)}</p>
                    {product.promotionalPrice ? <span className="text-[11px] text-emerald-300">Promo ativa</span> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="panel-block rounded-[16px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Saldo</p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-50">{totalStock} {getSectorUnitLabel(product.sector)}</p>
                  </div>
                  <div className="panel-block rounded-[16px] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Giro 30d</p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-50">{product.sales30d} vendas</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.82)]">Grade rápida</p>
                  <div className="flex flex-wrap gap-1.5">
                    {shownSizes.map((size) => (
                      <span className="rounded-full border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-slate-300" key={`${product.id}-${size}`}>
                        {size}
                      </span>
                    ))}
                    {hiddenSizeCount > 0 ? (
                      <span className="rounded-full border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                        +{hiddenSizeCount}
                      </span>
                    ) : null}
                  </div>
                </div>

                <Button className="w-full" onClick={() => onAdd(product)} size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar ao carrinho
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
