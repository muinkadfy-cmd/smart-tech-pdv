import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Grid2x2, ImagePlus, LayoutList, Plus, Trash2 } from "lucide-react";
import { ProductCatalogSummaryCards } from "@/components/products/product-catalog-summary";
import { ProductFiltersPanel } from "@/components/products/product-filters-panel";
import { ProductFormPreview } from "@/components/products/product-form-preview";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { ProductsCardGrid } from "@/components/products/products-card-grid";
import { ProductsTable } from "@/components/products/products-table";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { ResultLimitControl } from "@/components/shared/result-limit-control";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildProductImageDataUrl } from "@/features/products/product-image";
import { createDefaultProductFormValues, getSectorLabel } from "@/features/products/product.service";
import { productFormSchema } from "@/features/products/product.schemas";
import { buildProductLabelPrintPreview, openPrintPreviewWithOptions } from "@/features/printing/printing.service";
import { useBrands, useCategories, useProducts, useSettingsSnapshot } from "@/hooks/use-app-data";
import { useProductsCatalog } from "@/hooks/use-products-catalog";
import { hasActionAccessForProfile, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { confirmAction } from "@/lib/confirm-action";
import { appRepository } from "@/repositories/app-repository";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useProductCatalogStore } from "@/stores/product-catalog-store";
import type { Product, ProductSector } from "@/types/domain";

const fieldDefinitions: Array<{ label: string; field: keyof ReturnType<typeof createDefaultProductFormValues>; type?: "text" | "number" }> = [
  { label: "Nome do produto", field: "name" },
  { label: "SKU", field: "sku" },
  { label: "Código interno", field: "internalCode" },
  { label: "Código de barras", field: "barcode" },
  { label: "Subcategoria", field: "subcategory" },
  { label: "Gênero", field: "gender" },
  { label: "Material", field: "material" },
  { label: "Cor", field: "color" },
  { label: "Preço de custo", field: "costPrice", type: "number" },
  { label: "Preço de venda", field: "salePrice", type: "number" },
  { label: "Preço promocional", field: "promotionalPrice", type: "number" },
  { label: "Referência visual", field: "imageHint" }
];
const PRODUCT_CARD_BASE_LIMIT = 9;
const PRODUCT_CARD_STEP = 9;

export default function ProductsPage() {
  const { data: products, loading: loadingProducts, reload: reloadProducts } = useProducts();
  const { data: categories, loading: loadingCategories } = useCategories();
  const { data: brands, loading: loadingBrands } = useBrands();
  const settingsState = useSettingsSnapshot();
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const productViewMode = useAppShellStore((state) => state.productViewMode);
  const setProductViewMode = useAppShellStore((state) => state.setProductViewMode);
  const setFilters = useProductCatalogStore((state) => state.setFilters);
  const [formValues, setFormValues] = useState(createDefaultProductFormValues(operationFocus === "roupas" ? "roupas" : "calcados"));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("lista");
  const [visibleCardCount, setVisibleCardCount] = useState(PRODUCT_CARD_BASE_LIMIT);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const ready = !loadingProducts && !loadingCategories && !loadingBrands && !settingsState.loading && products && categories && brands && settingsState.data;
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

    return Array.from(new Set(result.error.issues.map((issue) => issue.message)));
  }, [formValues]);

  useEffect(() => {
    setVisibleCardCount(PRODUCT_CARD_BASE_LIMIT);
  }, [catalog.filteredProducts.length, productViewMode, operationFocus]);

  if (!ready || !products || !categories || !brands || !settingsState.data) {
    return <PageLoader />;
  }

  const currentRole = settingsState.data.currentUserRole;
  const activeLocalUser = resolveActiveLocalUserProfile(settingsState.data.localUsers, settingsState.data.activeLocalUserId);
  const canManageCatalog = hasActionAccessForProfile(activeLocalUser, "catalog_manage", currentRole);
  const canPrintLabels = hasActionAccessForProfile(activeLocalUser, "print_labels", currentRole);

  function mapProductToFormValues(product: Product) {
    return {
      sector: product.sector,
      name: product.name,
      sku: product.sku,
      internalCode: product.internalCode,
      barcode: product.barcode,
      brandId: product.brandId,
      categoryId: product.categoryId,
      subcategory: product.subcategory,
      gender: product.gender,
      material: product.material,
      color: product.color,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      promotionalPrice: product.promotionalPrice,
      tags: product.tags,
      status: product.status,
      imageHint: product.imageHint,
      imageDataUrl: product.imageDataUrl,
      sizes: product.variants.map((variant) => ({ size: variant.size, stock: variant.stock }))
    };
  }

  function buildPreviewProductFromForm(): Product | null {
    if (!formValues.name.trim() || !formValues.sku.trim() || !formValues.barcode.trim()) {
      return null;
    }

    return {
      id: editingProductId ?? "preview-product",
      sector: formValues.sector,
      name: formValues.name,
      sku: formValues.sku,
      internalCode: formValues.internalCode,
      barcode: formValues.barcode,
      brandId: formValues.brandId,
      categoryId: formValues.categoryId,
      subcategory: formValues.subcategory,
      gender: formValues.gender,
      material: formValues.material,
      color: formValues.color,
      costPrice: formValues.costPrice,
      salePrice: formValues.salePrice,
      promotionalPrice: formValues.promotionalPrice,
      tags: formValues.tags,
      status: formValues.status,
      imageHint: formValues.imageHint,
      imageDataUrl: formValues.imageDataUrl,
      variants: formValues.sizes.map((entry, index) => ({
        id: `${editingProductId ?? "preview-product"}-${entry.size}-${index}`,
        size: entry.size,
        stock: entry.stock,
        reserved: 0
      })),
      sales30d: 0
    };
  }

  async function handleSaveProduct() {
    setSaving(true);
    setError(null);
    setFeedback(null);

    const result = productFormSchema.safeParse(formValues);
    if (!result.success) {
      setSaving(false);
      setError(result.error.issues[0]?.message ?? "Preencha os campos obrigatórios.");
      return;
    }

    try {
      if (!canManageCatalog) {
        throw new Error("O perfil atual nao pode alterar cadastro de produtos.");
      }
      const saved = editingProductId ? await appRepository.updateProduct(editingProductId, result.data) : await appRepository.createProduct(result.data);
      reloadProducts();
      setFeedback(
        editingProductId
          ? `${getSectorLabel(saved.sector)} ${saved.name} atualizado com sucesso.`
          : `${getSectorLabel(saved.sector)} ${saved.name} cadastrado com sucesso.`
      );
      setEditingProductId(null);
      setFormValues(createDefaultProductFormValues(saved.sector));
      setActiveTab("lista");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o produto.");
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
    setFeedback("Rascunho duplicado para nova variação.");
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

  function handleEditProduct(product: Product) {
    setEditingProductId(product.id);
    setActiveTab("cadastro");
    setError(null);
    setFeedback(`Editando ${product.name}. Ajuste cadastro, grade e foto com seguranca.`);
    setFormValues(mapProductToFormValues(product));
  }

  async function handleToggleProductStatus(product: Product) {
    if (!canManageCatalog) {
      setError("O perfil atual pode consultar o catálogo, mas nao pode inativar ou reativar produto.");
      return;
    }
    const nextStatus = product.status === "active" ? "inactive" : "active";
    const confirmed = confirmAction(
      nextStatus === "active"
        ? `Reativar ${product.name} e voltar esse produto para venda e buscas operacionais?`
        : `Inativar ${product.name}? O produto deixa de aparecer como ativo no catálogo e no fluxo operacional.`
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await appRepository.updateProduct(product.id, {
        ...mapProductToFormValues(product),
        status: nextStatus
      });
      reloadProducts();
      setFeedback(`${product.name} ${nextStatus === "active" ? "reativado" : "inativado"} com sucesso.`);
      if (editingProductId === product.id) {
        setEditingProductId(null);
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Nao foi possivel atualizar o status do produto.");
    } finally {
      setSaving(false);
    }
  }

  function handleResetProductForm() {
    setEditingProductId(null);
    setError(null);
    setFeedback("Cadastro pronto para um novo produto.");
    setFormValues(createDefaultProductFormValues(formValues.sector));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      const imageDataUrl = await buildProductImageDataUrl(file);
      setFormValues((current) => ({
        ...current,
        imageDataUrl,
        imageHint: current.imageHint || `${current.sector === "calcados" ? "calcado" : "look"} com foto propria`
      }));
      setFeedback("Foto do produto preparada localmente para lista, PDV e estoque.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nao foi possivel carregar a foto do produto.");
    } finally {
      event.target.value = "";
    }
  }

  function handleClearImage() {
    setFormValues((current) => ({
      ...current,
      imageDataUrl: undefined
    }));
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function handleOpenLabels(autoPrint = false) {
    if (!canPrintLabels) {
      setError("A impressao de etiqueta de produto esta liberada somente para administrador ou super admin.");
      return;
    }
    const settings = settingsState.data;
    if (!settings) {
      setError("As configuracoes de impressao ainda nao foram carregadas.");
      return;
    }

    const previewProduct = activeTab === "cadastro" ? buildPreviewProductFromForm() ?? catalog.filteredProducts[0] : catalog.filteredProducts[0];
    if (!previewProduct) {
      setActiveTab("apoio");
      setFeedback("Nenhum produto filtrado para etiqueta agora. Abrimos a aba de apoio para revisar os layouts.");
      setError(null);
      return;
    }

    const opened = openPrintPreviewWithOptions(
      buildProductLabelPrintPreview({
        settings,
        product: previewProduct
      }),
      { autoPrint }
    );

    if (opened) {
      setFeedback(
        autoPrint
          ? `Dialogo de impressao aberto para a etiqueta de ${previewProduct.name}.`
          : activeTab === "cadastro"
            ? `Preview de etiqueta aberto para o cadastro atual de ${previewProduct.name}.`
            : `Preview de etiqueta aberto para ${previewProduct.name}.`
      );
      setError(null);
      return;
    }

    setError(`A janela de ${autoPrint ? "impressao" : "preview"} da etiqueta foi bloqueada. Libere pop-up para testar a impressao local.`);
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        compact
        actions={
          <>
            {canPrintLabels ? <Button onClick={() => handleOpenLabels(false)} variant="outline">Preview etiqueta</Button> : null}
            {canPrintLabels ? <Button onClick={() => handleOpenLabels(true)} variant="outline">Imprimir etiqueta</Button> : null}
            {canManageCatalog ? (
              <Button onClick={() => setActiveTab("cadastro")}>
                <Plus className="h-4 w-4" />
                Abrir cadastro
              </Button>
            ) : null}
          </>
        }
        badge={`${catalog.filteredProducts.length} SKUs no recorte atual`}
        description="Catalogo mais direto para cadastrar, ajustar status e localizar rapido o que vai para venda."
        eyebrow="Produtos"
        title="Catalogo produtivo e organizado"
      />

      <div className="section-rule pt-4">
        <ProductCatalogSummaryCards summary={catalog.summary} />
      </div>

      <Tabs className="space-y-0" onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro rapido</TabsTrigger>
          <TabsTrigger value="apoio">Apoio</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="lista">
          <ProductFiltersPanel brands={brands} categories={categories} />

          <Card className="executive-panel">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-400">
                <span>{catalog.filteredProducts.length} produtos encontrados</span>
                <span>•</span>
                <span>{catalog.summary.lowStockProducts} com estoque baixo</span>
                <Badge variant="outline">Foco {getSectorLabel(operationFocus).toLowerCase()}</Badge>
              </div>
              <div className="rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[linear-gradient(180deg,rgba(39,44,54,0.98),rgba(29,33,42,0.98))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_30px_-28px_rgba(0,0,0,0.44)] flex items-center gap-2">
                <Button onClick={() => setProductViewMode("table")} size="icon" variant={productViewMode === "table" ? "default" : "ghost"}>
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button onClick={() => setProductViewMode("cards")} size="icon" variant={productViewMode === "cards" ? "default" : "ghost"}>
                  <Grid2x2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {productViewMode === "table" ? (
            <ProductsTable brands={brands} canManageCatalog={canManageCatalog} categories={categories} onEdit={handleEditProduct} onToggleStatus={(product) => void handleToggleProductStatus(product)} products={catalog.filteredProducts} />
          ) : (
            <>
              <ProductsCardGrid brands={brands} canManageCatalog={canManageCatalog} categories={categories} onEdit={handleEditProduct} onToggleStatus={(product) => void handleToggleProductStatus(product)} products={catalog.filteredProducts.slice(0, visibleCardCount)} />
              <ResultLimitControl
                baseCount={PRODUCT_CARD_BASE_LIMIT}
                itemLabel="produtos"
                onReset={() => setVisibleCardCount(PRODUCT_CARD_BASE_LIMIT)}
                onShowMore={() => setVisibleCardCount((current) => Math.min(current + PRODUCT_CARD_STEP, catalog.filteredProducts.length))}
                totalCount={catalog.filteredProducts.length}
                visibleCount={Math.min(visibleCardCount, catalog.filteredProducts.length)}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="cadastro">
          {!canManageCatalog ? (
            <Card className="executive-panel">
              <CardContent className="space-y-3 p-6">
                <Badge variant="warning">Somente leitura</Badge>
                <p className="text-lg font-semibold text-slate-50">O perfil atual pode consultar o catálogo, mas nao pode editar produtos.</p>
                <p className="text-sm text-slate-400">Para criar, alterar grade, trocar foto ou inativar SKU, troque para um perfil administrador ou super admin.</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] 2xl:grid-cols-[1.18fr_0.82fr]">
            <div className="space-y-5">
              <Card className="executive-panel">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {(["calcados", "roupas"] as ProductSector[]).map((sector) => (
                      <Button key={sector} onClick={() => handleSectorChange(sector)} variant={formValues.sector === sector ? "default" : "outline"}>
                        {getSectorLabel(sector)}
                      </Button>
                    ))}
                    {editingProductId ? (
                      <Button onClick={handleResetProductForm} type="button" variant="outline">
                        Cancelar edição
                      </Button>
                    ) : null}
                  </div>
                  {editingProductId ? (
                    <div className="rounded-2xl border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(38,34,42,0.98),rgba(26,23,30,0.98))] px-4 py-3 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,248,228,0.08),0_18px_34px_-30px_rgba(0,0,0,0.72)]">
                      Editando produto existente. Ao salvar, o cadastro atual, a grade e a foto serão atualizados sem criar SKU duplicado.
                    </div>
                  ) : null}
                  <FormAssistPanel
                    description="Preencha primeiro nome, SKU, preços e categoria. Depois ajuste foto e grade para evitar cadastro incompleto no balcão."
                    tips={[
                      "SKU e código interno ajudam a equipe a localizar mais rápido na venda e no estoque.",
                      "Se a loja não usar código de barras em todos os itens, pode salvar mesmo assim e completar depois.",
                      "A foto é opcional, mas melhora muito a leitura no PDV e no catálogo."
                    ]}
                    title="Passo a passo do cadastro"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    {fieldDefinitions.map(({ label, field, type }) => (
                      <div className="space-y-2" key={String(field)}>
                        <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(214,190,142,0.78)]">{label}</label>
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

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(214,190,142,0.78)]">Foto do produto</label>
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        ref={photoInputRef}
                        type="file"
                      />
                      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                        <ProductImagePlaceholder
                          className="h-36"
                          imageDataUrl={formValues.imageDataUrl}
                          imageHint={formValues.imageHint}
                          name={formValues.name || "Produto da loja"}
                          sector={formValues.sector}
                        />
                        <div className="theme-preview-card flex flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-[13px] font-semibold text-slate-50">Upload offline pronto para balcão</p>
                            <p className="text-[13px] text-slate-400">
                              A foto fica salva no SQLite local, aparece no catálogo, no PDV e nas leituras de estoque sem depender de internet.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => photoInputRef.current?.click()} type="button" variant="outline">
                              <ImagePlus className="h-4 w-4" />
                              {formValues.imageDataUrl ? "Trocar foto" : "Enviar foto"}
                            </Button>
                            {formValues.imageDataUrl ? (
                              <Button onClick={handleClearImage} type="button" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(214,190,142,0.78)]">Marca</label>
                <select className="native-select h-10 text-[13px]" onChange={(event) => setFormValues((current) => ({ ...current, brandId: event.target.value }))} value={formValues.brandId}>
                        <option value="">Selecione</option>
                        {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:rgba(214,190,142,0.78)]">Categoria</label>
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
                    <p className="text-[14px] font-semibold text-slate-50">Grade por {formValues.sector === "calcados" ? "numeração" : "tamanho"}</p>
                    <p className="mt-1 text-[13px] text-slate-400">O sistema ajusta a grade automaticamente conforme o setor escolhido.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
                    {formValues.sizes.map((entry, index) => (
                      <div className="panel-block rounded-[18px] p-3" key={entry.size}>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(214,190,142,0.78)]">{entry.size}</p>
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
                  {error ? <div className="system-alert system-alert--error">{error}</div> : null}
                  {feedback ? <div className="system-alert system-alert--success">{feedback}</div> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={saving} onClick={() => void handleSaveProduct()}>{saving ? "Salvando..." : editingProductId ? "Salvar alterações" : "Salvar produto"}</Button>
                    <Button onClick={handleDuplicate} variant="outline">Duplicar cadastro</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <ProductFormPreview
                imageDataUrl={formValues.imageDataUrl}
                imageHint={formValues.imageHint}
                issues={formIssues}
                name={formValues.name}
                sector={formValues.sector}
              />
              <RecentAreaAuditPanel
                area="Produtos"
                description="Últimas alterações do catálogo e status do mix."
                emptyMessage="As próximas alterações de produto e catálogo vão aparecer aqui."
                title="Últimas ações do catálogo"
              />
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent className="space-y-5" value="apoio">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {categories.map((category) => (
              <Card className="executive-panel" key={category.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-xl font-semibold text-slate-50">{category.name}</p>
                    <Badge variant="outline">{getSectorLabel(category.sector)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Participação atual no mix: {category.share}%.</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {brands.map((brand) => (
              <Card className="executive-panel" key={brand.id}>
                <CardContent className="space-y-2 p-5">
                  <p className="font-display text-xl font-semibold text-slate-50">{brand.name}</p>
                  <p className="text-sm text-muted-foreground">Prazo médio {brand.leadTimeDays} dias.</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-5 lg:grid-cols-2 2xl:grid-cols-3">
              {[
                ["Etiqueta P", "Ideal para gôndola e vitrine compacta"],
                ["Etiqueta M", "Equilíbrio entre SKU, preco e codigo"],
                ["Etiqueta promocional", "Destaque visual para giro rápido"]
              ].map(([item, helper]) => (
                <div className="empty-state-box" key={item}>
                  <p className="font-semibold text-slate-50">{item}</p>
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
