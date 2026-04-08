import { getSectorLabel, getSectorUnitLabel } from "@/features/products/product.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { formatCurrency } from "@/lib/utils";
import type { Brand, Category, Product } from "@/types/domain";

interface ProductsCardGridProps {
  products: Product[];
  brands: Brand[];
  categories: Category[];
}

export function ProductsCardGrid({ products, brands, categories }: ProductsCardGridProps) {
  const brandMap = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <Card className="executive-panel" key={product.id}>
          <CardContent className="space-y-3 p-4">
            <ProductImagePlaceholder className="h-28" imageHint={product.imageHint} name={product.name} sector={product.sector} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{getSectorLabel(product.sector)}</Badge>
                  <Badge variant={product.status === "active" ? "success" : "outline"}>
                    {product.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-[16px] font-semibold text-slate-950">{product.name}</p>
                <p className="mt-1 text-[12px] text-slate-600">
                  {brandMap[product.brandId]} • {categoryMap[product.categoryId]}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="panel-block rounded-[18px] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preco</p>
                <p className="mt-1.5 font-semibold text-slate-950">{formatCurrency(product.promotionalPrice ?? product.salePrice)}</p>
              </div>
              <div className="panel-block rounded-[18px] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Estoque</p>
                <p className="mt-1.5 font-semibold text-slate-950">
                  {product.variants.reduce((sum, variant) => sum + variant.stock, 0)} {getSectorUnitLabel(product.sector)}
                </p>
              </div>
            </div>
            <div className="text-[12px] text-slate-600">
              Grade: {product.variants.map((variant) => `${variant.size}:${variant.stock}`).slice(0, 5).join("  ·  ")}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
