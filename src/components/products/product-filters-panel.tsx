import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSectorLabel, getSectorSizes } from "@/features/products/product.service";
import { useProductCatalogStore } from "@/stores/product-catalog-store";
import type { Brand, Category, ProductSector } from "@/types/domain";

interface ProductFiltersPanelProps {
  categories: Category[];
  brands: Brand[];
}

const sectorOptions: Array<"geral" | ProductSector> = ["geral", "calcados", "roupas"];

export function ProductFiltersPanel({ categories, brands }: ProductFiltersPanelProps) {
  const filters = useProductCatalogStore((state) => state.filters);
  const setFilters = useProductCatalogStore((state) => state.setFilters);
  const resetFilters = useProductCatalogStore((state) => state.resetFilters);
  const advancedFiltersOpen = useProductCatalogStore((state) => state.advancedFiltersOpen);
  const toggleAdvancedFilters = useProductCatalogStore((state) => state.toggleAdvancedFilters);

  const filteredCategories = filters.sector === "geral" ? categories : categories.filter((category) => category.sector === filters.sector);
  const sizeOptions = filters.sector === "roupas" ? getSectorSizes("roupas") : filters.sector === "calcados" ? getSectorSizes("calcados") : [...getSectorSizes("calcados"), ...getSectorSizes("roupas")];

  const activeChips = [
    filters.sector !== "geral" ? `Setor: ${getSectorLabel(filters.sector)}` : null,
    filters.categoryId ? `Categoria: ${filteredCategories.find((category) => category.id === filters.categoryId)?.name ?? "Selecionada"}` : null,
    filters.brandId ? `Marca: ${brands.find((brand) => brand.id === filters.brandId)?.name ?? "Selecionada"}` : null,
    filters.status !== "all" ? `Status: ${filters.status === "active" ? "Ativo" : "Inativo"}` : null,
    filters.gender !== "all" ? `Gênero: ${filters.gender}` : null,
    filters.size ? `Grade: ${filters.size}` : null,
    filters.lowStockOnly ? "Somente estoque baixo" : null,
    filters.promoOnly ? "Somente promoção" : null
  ].filter(Boolean) as string[];

  return (
    <Card className="surface-rule">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {sectorOptions.map((sector) => (
            <Button key={sector} onClick={() => setFilters({ sector, categoryId: null, size: null })} size="sm" variant={filters.sector === sector ? "default" : "outline"}>
              {getSectorLabel(sector)}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="premium-tile flex flex-1 items-center gap-3 rounded-[18px] border border-[rgba(201,168,111,0.14)] px-4 py-2.5">
            <Input
              className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0"
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder="Pesquisar por nome, SKU, código interno ou código de barras"
              value={filters.search}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={toggleAdvancedFilters} size="sm" variant="outline">
              {advancedFiltersOpen ? "Ocultar filtros" : "Filtros avançados"}
            </Button>
            <Button onClick={resetFilters} size="sm" variant="ghost">
              <RotateCcw className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <span className="rounded-full border border-[rgba(201,168,111,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[12px] font-medium text-slate-200" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <div className="premium-tile rounded-[16px] px-3.5 py-3 text-[13px] text-slate-400">
            Catálogo limpo para leitura geral. Aplique filtros para achar marcas, categorias, promoções e rupturas mais rápido.
          </div>
        )}

        {advancedFiltersOpen ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <select className="native-select h-10 text-[13px]" onChange={(event) => setFilters({ categoryId: event.target.value || null })} value={filters.categoryId ?? ""}>
              <option value="">Todas as categorias</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setFilters({ brandId: event.target.value || null })} value={filters.brandId ?? ""}>
              <option value="">Todas as marcas</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setFilters({ status: event.target.value as typeof filters.status })} value={filters.status}>
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setFilters({ gender: event.target.value })} value={filters.gender}>
              <option value="all">Todos os gêneros</option>
              <option value="Unissex">Unissex</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setFilters({ size: event.target.value || null })} value={filters.size ?? ""}>
              <option value="">Todas as grades</option>
              {sizeOptions.map((size) => <option key={size} value={String(size)}>{size}</option>)}
            </select>
            <label className="premium-tile flex items-center gap-3 rounded-xl px-4 text-[13px] font-medium text-slate-200">
              <input checked={filters.lowStockOnly} onChange={(event) => setFilters({ lowStockOnly: event.target.checked })} type="checkbox" />
              Só estoque baixo
            </label>
            <label className="premium-tile flex items-center gap-3 rounded-xl px-4 text-[13px] font-medium text-slate-200">
              <input checked={filters.promoOnly} onChange={(event) => setFilters({ promoOnly: event.target.checked })} type="checkbox" />
              Só promoção
            </label>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
