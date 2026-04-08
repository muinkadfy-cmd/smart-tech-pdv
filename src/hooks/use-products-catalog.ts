import { useMemo } from "react";
import { buildProductCatalogSummary, filterProducts } from "@/features/products/product.service";
import { useProductCatalogStore } from "@/stores/product-catalog-store";
import type { Product } from "@/types/domain";

export function useProductsCatalog(products: Product[]) {
  const filters = useProductCatalogStore((state) => state.filters);

  return useMemo(() => {
    const filteredProducts = filterProducts(products, filters);
    const summary = buildProductCatalogSummary(filteredProducts);

    return {
      filters,
      filteredProducts,
      summary
    };
  }, [filters, products]);
}
