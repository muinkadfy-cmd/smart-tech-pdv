import type {
  Brand,
  Category,
  OperationFocus,
  Product,
  ProductCatalogSummary,
  ProductFilters,
  ProductFormValues,
  ProductSector
} from "@/types/domain";

export const defaultProductFilters: ProductFilters = {
  search: "",
  sector: "geral",
  categoryId: null,
  brandId: null,
  status: "all",
  gender: "all",
  size: null,
  lowStockOnly: false,
  promoOnly: false
};

export function getSectorSizes(sector: ProductSector) {
  if (sector === "roupas") {
    return ["PP", "P", "M", "G", "GG", "EXG", "UN"];
  }

  return ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];
}

export function getSectorLabel(sector: ProductSector | OperationFocus) {
  if (sector === "calcados") return "Calçados";
  if (sector === "roupas") return "Roupas";
  return "Geral";
}

export function getSectorUnitLabel(sector: ProductSector) {
  return sector === "calcados" ? "pares" : "peças";
}

export function createDefaultProductFormValues(sector: ProductSector = "calcados"): ProductFormValues {
  return {
    sector,
    name: "",
    sku: "",
    internalCode: "",
    barcode: "",
    brandId: "",
    categoryId: "",
    subcategory: "",
    gender: sector === "calcados" ? "Unissex" : "Feminino",
    material: "",
    color: "",
    costPrice: 0,
    salePrice: 0,
    promotionalPrice: undefined,
    tags: sector === "calcados" ? ["Novo"] : ["Moda"],
    status: "active",
    imageHint: sector === "calcados" ? "calcado premium" : "look feminino premium",
    sizes: getSectorSizes(sector).map((size) => ({ size, stock: 0 }))
  };
}

export const defaultProductFormValues = createDefaultProductFormValues();

function getProductUnits(product: Product) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

function hasSelectedSize(product: Product, selectedSize: string | null) {
  if (!selectedSize) {
    return true;
  }

  return product.variants.some((variant) => variant.size === selectedSize);
}

function matchesSector(product: Product, sector: OperationFocus) {
  return sector === "geral" || product.sector === sector;
}

export function filterProducts(products: Product[], filters: ProductFilters) {
  const query = filters.search.trim().toLowerCase();

  return products.filter((product) => {
    const searchable = [
      product.name,
      product.sku,
      product.internalCode,
      product.barcode,
      product.color,
      product.subcategory,
      getSectorLabel(product.sector)
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = query.length === 0 || searchable.includes(query);
    const matchesSectorFilter = matchesSector(product, filters.sector);
    const matchesCategory = !filters.categoryId || product.categoryId === filters.categoryId;
    const matchesBrand = !filters.brandId || product.brandId === filters.brandId;
    const matchesStatus = filters.status === "all" || product.status === filters.status;
    const matchesGender = filters.gender === "all" || product.gender === filters.gender;
    const matchesSize = hasSelectedSize(product, filters.size);
    const units = getProductUnits(product);
    const matchesLowStock = !filters.lowStockOnly || units <= 10;
    const matchesPromo = !filters.promoOnly || Boolean(product.promotionalPrice);

    return (
      matchesQuery &&
      matchesSectorFilter &&
      matchesCategory &&
      matchesBrand &&
      matchesStatus &&
      matchesGender &&
      matchesSize &&
      matchesLowStock &&
      matchesPromo
    );
  });
}

export function buildProductCatalogSummary(products: Product[]): ProductCatalogSummary {
  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.status === "active").length;
  const promotionalProducts = products.filter((product) => product.promotionalPrice).length;
  const lowStockProducts = products.filter((product) => getProductUnits(product) <= 10).length;
  const totalUnits = products.reduce((sum, product) => sum + getProductUnits(product), 0);
  const averageMargin =
    totalProducts === 0
      ? 0
      : products.reduce((sum, product) => sum + ((product.salePrice - product.costPrice) / product.salePrice) * 100, 0) / totalProducts;

  return {
    totalProducts,
    activeProducts,
    promotionalProducts,
    lowStockProducts,
    averageMargin,
    totalUnits
  };
}

export function getProductLookupMaps(brands: Brand[], categories: Category[]) {
  return {
    brandMap: Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    categoryMap: Object.fromEntries(categories.map((category) => [category.id, category.name]))
  };
}
