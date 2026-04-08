import { useEffect, useMemo, useState } from "react";
import { Grid2x2, LayoutList, Plus } from "lucide-react";
import { ProductCatalogSummaryCards } from "@/components/products/product-catalog-summary";
import { ProductFiltersPanel } from "@/components/products/product-filters-panel";
import { ProductFormPreview } from "@/components/products/product-form-preview";
import { ProductsCardGrid } from "@/components/products/products-card-grid";
import { ProductsTable } from "@/components/products/products-table";
import { ModuleHeader } from "@/components/shared/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDefaultProductFormValues, getSectorLabel, getSectorSizes } from "@/features/products/product.service";
import { productFormSchema } from "@/features/products/product.schemas";
import { useBrands, useCategories, useProducts } from "@/hooks/use-app-data";
import { useProductsCatalog } from "@/hooks/use-products-catalog";
import { appRepository } from "@/repositories/app-repository";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useProductCatalogStore } from "@/stores/product-catalog-store";
import type { ProductSector } from "@/types/domain";

const fieldDefinitions: Array<{ label: string; field: keyof ReturnType<typeof createDefaultProductFormValues>; type?: "text" | "number" }> = [
  { label: "Nome do produto", field: "name" },
  { label: "SKU", field: "sku" },
  { label: "Codigo interno", field: "internalCode" },
  { label: "Codigo de barras", field: "barcode" },
  { label: "Subcategoria", field: "subcategory" },
  { label: "Genero", field: "gender" },
  { label: "Material", field: "material" },
  { label: "Cor", field: "color" },
  { label: "Preco custo", field: "costPrice", type: "number" },
  { label: "Preco venda", field: "salePrice", type: "number" },
  { label: "Preco promocional", field: "promotionalPrice", type: "number" },
  { label: "Referencia visual", field: "imageHint" }
];

export default function ProductsPage() {
  const { data: products, loading: loadingProducts, reload: reloadProducts } = useProducts();
  const { data: categories, loading: loadingCategories } = useCategories();
  const { data: brands, loading: loadingBrands } = useBrands();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const productViewMode = useAppShellStore((state) => state.productViewMode);
  const setProductViewMode = useAppShellStore((state) => state.setProductViewMode);
  const setFilters = useProductCatalogStore((state) => state.setFilters);
  const [formValues, setFormValues] = useState(createDefaultProductFormValues(operationFocus === "roupas" ? "roupas" : "calcados"));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = !loadingProducts && !loadingCategories && !loadingBrands && products && categories && brands;
  const catalog = useProductsCatalog(products ?? []);

  useEffect(() => {
    setFilters({ sector: operationFocus, categoryId: null, size: null });
  }, [operationFocus, setFilters]);

  useEffect(() => {
    if (operationFocus === "calcados" || operationFocus === "roupas") {
      setFormValues((current) => {
        if (current.sector === operationFocus) {
          return current;
        }
        const next = createDefaultProductFormValues(operationFocus);
        return {
          ...next,
          brandId: current.brandId,
          categoryId: "",
          gender: current.gender,
          material: current.material,
          color: current.color
        };
      });
    }
  }, [operationFocus]);

  const availableCategories = useMemo(
    () => (formValues.sector ? categories?.filter((category) => category.sector === formValues.sector) ?? [] : categories ?? []),
    [categories, formValues.sector]
  );

  const formIssues = useMemo(() => {
    const result = productFormSchema.safeParse(formValues);
    if (result.success) {
      return [];
    }

    return result.error.issues.map((issue) => issue.message);
  }, [formValues]);

  if (!ready || !products || !categories || !brands) {
    return null;
  }

  async function handleSaveProduct() {
    setSaving(true);
    setError(null);
    setFeedback(null);

    const result = productFormSchema.safeParse(formValues);
    if (!result.success) {
      setSaving(false);
      setError(result.error.issues[0]?.message ?? "Preencha os campos obrigatorios.");
      return;
    }

    try {
      const created = await appRepository.createProduct(result.data);
      reloadProducts();
      setFeedback(`${getSectorLabel(created.sector)} ${created.name} cadastrado com sucesso.`);
      setFormValues(createDefaultProductFormValues(created.sector));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  function handleDuplicate() {
    setFormValues((current) => ({
      ...current,
      name: current.name ? `${current.name} - copia` : current.name,
      sku: current.sku ? `${current.sku}-C` : current.sku,
      internalCode: current.internalCode ? `${current.internalCode}-C` : current.internalCode,
      barcode: current.barcode ? `${current.barcode}99` : current.barcode
    }));
    setFeedback("Rascunho duplicado para nova variacao.");
    setError(null);
  }

  function handleSectorChange(sector: ProductSector) {
    const next = createDefaultProductFormValues(sector);
    setFormValues((current) => ({
      ...next,
      brandId: current.brandId,
      material: current.material,
      color: current.color
    }));
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        actions={
          <>
            <Button variant="outline">Etiquetas</Button>
            <Button onClick={() => handleSectorChange(formValues.sector)}>
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </>
        }
        badge={`${catalog.filteredProducts.length} SKUs no recorte atual`}
        description="Catalogo agora preparado para operar moda e calçados no mesmo sistema, com foco por setor, grade correta e cadastro mais guiado."
        eyebrow="Produtos"
        title="Catalogo produtivo e organizado"
      />

      <div className="section-rule pt-4">
        <ProductCatalogSummaryCards summary={catalog.summary} />
      </div>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Linha de trabalho</p>
            <p className="text-[15px] font-semibold text-slate-950">Catálogo com foco por setor, cadastro rápido e leitura comercial mais fechada.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Foco atual</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{getSectorLabel(operationFocus)}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Visualização</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{productViewMode === "table" ? "Tabela" : "Cards"}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Acesso rápido</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Cadastro + etiquetas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs className="space-y-0" defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro rapido</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="lista">
          <ProductFiltersPanel brands={brands} categories={categories} />

          <div className="workspace-strip flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
              <span>{catalog.filteredProducts.length} produtos encontrados</span>
              <span>•</span>
              <span>{catalog.summary.lowStockProducts} com estoque baixo</span>
              <span>•</span>
              <span>{catalog.summary.promotionalProducts} em promocao</span>
              <Badge variant="outline">Foco {getSectorLabel(operationFocus).toLowerCase()}</Badge>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/35 p-1.5">
              <Button onClick={() => setProductViewMode("table")} size="icon" variant={productViewMode === "table" ? "default" : "ghost"}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button onClick={() => setProductViewMode("cards")} size="icon" variant={productViewMode === "cards" ? "default" : "ghost"}>
                <Grid2x2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {productViewMode === "table" ? (
            <ProductsTable brands={brands} categories={categories} products={catalog.filteredProducts} />
          ) : (
            <ProductsCardGrid brands={brands} categories={categories} products={catalog.filteredProducts} />
          )}
        </TabsContent>

        <TabsContent value="cadastro">
          <div className="grid gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <Card className="executive-panel">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {(["calcados", "roupas"] as ProductSector[]).map((sector) => (
                      <Button key={sector} onClick={() => handleSectorChange(sector)} variant={formValues.sector === sector ? "default" : "outline"}>
                        {getSectorLabel(sector)}
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {fieldDefinitions.map(({ label, field, type }) => (
                      <div className="space-y-2" key={String(field)}>
                        <label className="text-[13px] font-medium text-slate-900">{label}</label>
                        <Input
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              [field]: type === "number" ? Number(event.target.value) || 0 : event.target.value
                            }))
                          }
                          placeholder={`Preencher ${String(label).toLowerCase()}`}
                          type={type ?? "text"}
                          value={String((formValues as unknown as Record<string, unknown>)[field] ?? "")}
                        />
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-900">Marca</label>
                <select className="native-select h-10 text-[13px]" onChange={(event) => setFormValues((current) => ({ ...current, brandId: event.target.value }))} value={formValues.brandId}>
                        <option value="">Selecione</option>
                        {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-slate-900">Categoria</label>
                <select className="native-select h-10 text-[13px]" onChange={(event) => setFormValues((current) => ({ ...current, categoryId: event.target.value }))} value={formValues.categoryId}>
                        <option value="">Selecione</option>
                        {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="executive-panel">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-950">Grade por {formValues.sector === "calcados" ? "numeração" : "tamanho"}</p>
                    <p className="mt-1 text-[13px] text-slate-600">O sistema ajusta a grade automaticamente conforme o setor escolhido.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
                    {formValues.sizes.map((entry, index) => (
                      <div className="panel-block rounded-[18px] p-3" key={entry.size}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{entry.size}</p>
                        <Input
                          className="mt-3"
                          min={0}
                          onChange={(event) => {
                            const stock = Number(event.target.value) || 0;
                            setFormValues((current) => ({
                              ...current,
                              sizes: current.sizes.map((item, itemIndex) => itemIndex === index ? { ...item, stock } : item)
                            }));
                          }}
                          type="number"
                          value={entry.stock}
                        />
                      </div>
                    ))}
                  </div>
                  {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                  {feedback ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={saving} onClick={() => void handleSaveProduct()}>{saving ? "Salvando..." : "Salvar produto"}</Button>
                    <Button onClick={handleDuplicate} variant="outline">Duplicar cadastro</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <ProductFormPreview issues={formIssues} />
          </div>
        </TabsContent>

        <TabsContent value="categorias">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <Card className="executive-panel" key={category.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-xl font-semibold text-slate-950">{category.name}</p>
                    <Badge variant="outline">{getSectorLabel(category.sector)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Participacao atual no mix: {category.share}%.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marcas">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {brands.map((brand) => (
              <Card className="executive-panel" key={brand.id}>
                <CardContent className="space-y-2 p-5">
                  <p className="font-display text-xl font-semibold text-slate-950">{brand.name}</p>
                  <p className="text-sm text-muted-foreground">Prazo medio {brand.leadTimeDays} dias.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="etiquetas">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-6 lg:grid-cols-3">
              {[
                ["Etiqueta P", "Ideal para gondola e vitrine compacta"],
                ["Etiqueta M", "Equilibrio entre SKU, preco e codigo"],
                ["Etiqueta promocional", "Destaque visual para giro rapido"]
              ].map(([item, helper]) => (
                <div className="empty-state-box" key={item}>
                  <p className="font-semibold text-slate-950">{item}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
