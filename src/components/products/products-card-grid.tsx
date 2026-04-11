import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePreview } from "@/components/shared/product-image-preview";
import { formatCurrency } from "@/lib/utils";
import type { Brand, Category, Product } from "@/types/domain";

interface ProductsCardGridProps {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  canManageCatalog?: boolean;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

export function ProductsCardGrid({ products, brands, categories, canManageCatalog = true, onEdit, onToggleStatus }: ProductsCardGridProps) {
  const brandMap = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  if (products.length === 0) {
    return (
      <Card className="executive-panel">
        <CardContent className="empty-state-box p-6 text-center">
          <p className="font-semibold text-slate-50">Nenhum produto encontrado neste recorte.</p>
          <p className="mt-2 text-sm text-muted-foreground">Revise filtros, setor ou cadastro rápido para montar um catálogo mais útil para a venda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => {
        const units = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        const price = product.promotionalPrice ?? product.salePrice;
        const visibleTags = product.tags.slice(0, 3);
        const gradePreview = product.variants.filter((variant) => variant.stock > 0).slice(0, 4);

        return (
          <Card className="executive-panel overflow-hidden" key={product.id}>
            <CardContent className="space-y-3.5 p-4">
              <ProductImagePreview className="h-32 rounded-[18px] border border-[rgba(201,168,111,0.10)] bg-[rgba(255,255,255,0.02)]" imageDataUrl={product.imageDataUrl} imageHint={product.imageHint} modalDescription="Foto real ampliada do produto em visual de catálogo." name={product.name} sector={product.sector} />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getSectorLabel(product.sector)}</Badge>
                  <Badge variant={product.status === "active" ? "success" : "outline"}>
                    {product.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-slate-50 line-clamp-2">{product.name}</p>
                  <p className="mt-1 text-[12px] text-slate-400">{brandMap[product.brandId]} • {categoryMap[product.categoryId]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="premium-tile rounded-[18px] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Preço</p>
                  <p className="mt-1.5 font-semibold text-slate-50">{formatCurrency(price)}</p>
                  {product.promotionalPrice ? <p className="mt-1 text-[11px] text-slate-400 line-through">{formatCurrency(product.salePrice)}</p> : <p className="mt-1 text-[11px] text-slate-400">Venda principal do catálogo</p>}
                </div>
                <div className="premium-tile rounded-[18px] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Saldo</p>
                  <p className="mt-1.5 font-semibold text-slate-50">{units} {getSectorUnitLabel(product.sector)}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{product.sku}</p>
                </div>
              </div>
              <div className="premium-tile rounded-[18px] px-3 py-3 text-[12px] text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-[0.16em] text-slate-400">Grade ativa</span>
                  <span className="font-medium text-slate-100">{product.internalCode}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gradePreview.length > 0 ? gradePreview.map((variant) => (
                    <span className="rounded-full border border-[rgba(201,168,111,0.14)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1" key={`${product.id}-${variant.size}`}>
                      {variant.size}: {variant.stock}
                    </span>
                  )) : <span className="text-slate-400">Sem saldo disponível nas grades.</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              {canManageCatalog ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => onEdit(product)} size="sm" variant="outline">
                    Editar cadastro
                  </Button>
                  <Button onClick={() => onToggleStatus(product)} size="sm" variant="outline">
                    {product.status === "active" ? "Inativar" : "Reativar"}
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary">Somente leitura</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
