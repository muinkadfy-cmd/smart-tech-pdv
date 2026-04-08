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
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => (
        <Card className="executive-panel transition hover:-translate-y-[1px]" key={product.id}>
          <CardContent className="space-y-3 p-4">
            <button className="w-full text-left" onClick={() => onAdd(product)} type="button">
              <ProductImagePlaceholder className="h-20" imageHint={product.imageHint} name={product.name} sector={product.sector} />
            </button>
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="outline">{getSectorLabel(product.sector)}</Badge>
                <Badge variant={product.status === "active" ? "success" : "outline"}>{product.status === "active" ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-[15px] font-semibold text-slate-950">{product.name}</p>
              <p className="text-[12px] text-slate-600">{product.sku}</p>
            </div>
            <div className="panel-block grid grid-cols-2 gap-3 rounded-[18px] p-3 text-sm text-muted-foreground">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preço</p>
                <p className="mt-1 font-display text-[18px] font-semibold text-slate-950">{formatCurrency(product.promotionalPrice ?? product.salePrice)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Saldo</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {product.variants.reduce((sum, variant) => sum + variant.stock, 0)} {getSectorUnitLabel(product.sector)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-600">{product.variants.map((variant) => variant.size).slice(0, 6).join(" • ")}</div>
              <Button onClick={() => onAdd(product)} size="sm">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
