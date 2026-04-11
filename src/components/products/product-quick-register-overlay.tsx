import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Expand, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { ProductFormPreview } from "@/components/products/product-form-preview";
import { ProductImagePlaceholder } from "@/components/shared/product-image-placeholder";
import { QUICK_ACCESS_OVERLAY_INNER_FRAME_CLASS, QUICK_ACCESS_OVERLAY_PANEL_CLASS } from "@/components/shared/quick-access-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildProductImageDataUrl } from "@/features/products/product-image";
import { useBrands, useCategories, useProducts, useSettingsSnapshot } from "@/hooks/use-app-data";
import { createDefaultProductFormValues, getSectorLabel } from "@/features/products/product.service";
import { productFormSchema } from "@/features/products/product.schemas";
import { hasActionAccessForProfile, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { appRepository } from "@/repositories/app-repository";
import { useAppShellStore } from "@/stores/app-shell-store";
import { cn } from "@/lib/utils";
import type { ProductFormValues, ProductSector } from "@/types/domain";

function normalizeIdentifierText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .toUpperCase();
}

function buildShortCode(value: string, fallback: string, maxTokens = 2) {
  const tokens = normalizeIdentifierText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxTokens)
    .map((token) => token.slice(0, 3));

  return tokens.length ? tokens.join("") : fallback;
}

function hashToDigits(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return String(hash).padStart(length, "0").slice(0, length);
}

function buildQuickCodes(sector: ProductSector, name: string, subcategory: string, seed: string) {
  const sectorPrefix = sector === "calcados" ? "CAL" : "ROP";
  const productCode = buildShortCode(name, sector === "calcados" ? "PRO" : "MOD");
  const descriptionCode = buildShortCode(subcategory, "LIN");
  const hashBase = `${sector}|${name}|${subcategory}|${seed}`;
  const suffix = hashToDigits(hashBase, 6);

  return {
    sku: `${sectorPrefix}-${productCode}-${descriptionCode}-${suffix}`,
    internalCode: `QR-${sectorPrefix}-${hashToDigits(`INT|${hashBase}`, 5)}`,
    barcode: `789${hashToDigits(`BAR|${hashBase}`, 10)}`
  };
}

function createQuickDraft(sector: ProductSector, seed: string, categoryId?: string, brandId?: string): ProductFormValues {
  const base = createDefaultProductFormValues(sector);
  const subcategory = sector === "calcados" ? "Linha rápida" : "Moda rápida";
  const codes = buildQuickCodes(sector, "", subcategory, seed);

  return {
    ...base,
    ...codes,
    brandId: brandId ?? "",
    categoryId: categoryId ?? "",
    subcategory,
    material: sector === "calcados" ? "Material premium" : "Malha premium",
    color: "Preto",
    costPrice: 59.9,
    salePrice: sector === "calcados" ? 129.9 : 89.9
  };
}

export function ProductQuickRegisterOverlay() {
  const navigate = useNavigate();
  const productQuickRegisterOpen = useAppShellStore((state) => state.productQuickRegisterOpen);
  const closeProductQuickRegister = useAppShellStore((state) => state.closeProductQuickRegister);
  const operationFocus = useAppShellStore((state) => state.operationFocus);
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const { data: settings } = useSettingsSnapshot();
  const { reload: reloadProducts } = useProducts();
  const [draft, setDraft] = useState<ProductFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identitySeed, setIdentitySeed] = useState(() => Date.now().toString().slice(-6));
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const sector = useMemo<ProductSector>(() => (operationFocus === "roupas" ? "roupas" : "calcados"), [operationFocus]);
  const sectorCategories = useMemo(
    () => (categories ?? []).filter((category) => category.sector === (draft?.sector ?? sector)),
    [categories, draft?.sector, sector]
  );
  const brandOptions = brands ?? [];
  const issues = useMemo(() => {
    if (!draft) {
      return [];
    }
    const result = productFormSchema.safeParse(draft);
    return result.success ? [] : Array.from(new Set(result.error.issues.map((issue) => issue.message)));
  }, [draft]);
  const generatedCodes = useMemo(() => {
    const fallbackSector = draft?.sector ?? sector;
    const fallbackSubcategory = draft?.subcategory ?? (fallbackSector === "calcados" ? "Linha rápida" : "Moda rápida");
    return buildQuickCodes(fallbackSector, draft?.name ?? "", fallbackSubcategory, identitySeed);
  }, [draft?.name, draft?.sector, draft?.subcategory, identitySeed, sector]);
  const activeLocalUser = settings ? resolveActiveLocalUserProfile(settings.localUsers, settings.activeLocalUserId) : null;
  const canManageCatalog = hasActionAccessForProfile(activeLocalUser, "catalog_manage", settings?.currentUserRole ?? "operador");

  useEffect(() => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      if (
        current.sku === generatedCodes.sku &&
        current.internalCode === generatedCodes.internalCode &&
        current.barcode === generatedCodes.barcode
      ) {
        return current;
      }

      return {
        ...current,
        sku: generatedCodes.sku,
        internalCode: generatedCodes.internalCode,
        barcode: generatedCodes.barcode
      };
    });
  }, [generatedCodes]);

  useEffect(() => {
    if (!productQuickRegisterOpen) {
      return;
    }

    const resolvedSector = operationFocus === "roupas" ? "roupas" : "calcados";
    const firstBrandId = brands?.[0]?.id;
    const firstCategoryId = categories?.find((category) => category.sector === resolvedSector)?.id;
    const nextSeed = Date.now().toString().slice(-6);
    setIdentitySeed(nextSeed);
    setDraft(createQuickDraft(resolvedSector, nextSeed, firstCategoryId, firstBrandId));
    setError(null);
    setFeedback(null);
    setImagePreviewOpen(false);

    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 120);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeProductQuickRegister();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [productQuickRegisterOpen, closeProductQuickRegister, operationFocus, brands, categories]);

  if (!productQuickRegisterOpen || !draft || !canManageCatalog) {
    return null;
  }

  function handleSectorChange(nextSector: ProductSector) {
    const firstBrandId = brands?.[0]?.id;
    const firstCategoryId = categories?.find((category) => category.sector === nextSector)?.id;
    const nextSeed = Date.now().toString().slice(-6);
    setIdentitySeed(nextSeed);
    const nextDraft = createQuickDraft(nextSector, nextSeed, firstCategoryId, firstBrandId);

    setDraft((current) => ({
      ...nextDraft,
      name: current?.name ?? "",
      costPrice: current?.costPrice ?? nextDraft.costPrice,
      salePrice: current?.salePrice ?? nextDraft.salePrice,
      promotionalPrice: current?.promotionalPrice,
      color: current?.color || nextDraft.color
    }));
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    const result = productFormSchema.safeParse(draft);
    if (!result.success) {
      setSaving(false);
      setError(result.error.issues[0]?.message ?? "Revise os campos obrigatórios.");
      return;
    }

    try {
      const created = await appRepository.createProduct(result.data);
      reloadProducts();
      setFeedback(`${created.name} cadastrado com sucesso.`);
      const firstBrandId = brands?.[0]?.id;
      const firstCategoryId = categories?.find((category) => category.sector === created.sector)?.id;
      const nextSeed = Date.now().toString().slice(-6);
      setIdentitySeed(nextSeed);
      setDraft(createQuickDraft(created.sector, nextSeed, firstCategoryId, firstBrandId));
      window.setTimeout(() => nameInputRef.current?.focus(), 80);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
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
      setDraft((current) => current ? ({
        ...current,
        imageDataUrl,
        imageHint: current.imageHint || `${current.name || "produto"} com foto própria`
      }) : current);
      setFeedback("Imagem preparada e salva para miniatura local.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível carregar a imagem do produto.");
    } finally {
      event.target.value = "";
    }
  }

  function handleClearImage() {
    setDraft((current) => current ? { ...current, imageDataUrl: undefined } : current);
    setImagePreviewOpen(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[85] bg-[rgba(4,8,14,0.58)] backdrop-blur-[3px]">
      <div className={QUICK_ACCESS_OVERLAY_INNER_FRAME_CLASS}>
        <section className={QUICK_ACCESS_OVERLAY_PANEL_CLASS}>
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(201,168,111,0.12)] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[22px] font-semibold tracking-[-0.03em] text-slate-50 sm:text-[24px] lg:text-[26px]">Cadastro rápido</p>
                <Badge variant="outline">F3 global</Badge>
              </div>
              <p className="mt-1 text-[13px] text-slate-400 sm:text-sm">Janela rápida para cadastrar produto sem sair da operação atual.</p>
            </div>
            <Button onClick={closeProductQuickRegister} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 xl:grid-cols-[1.04fr_0.96fr]">
            <div className="native-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {(["calcados", "roupas"] as ProductSector[]).map((item) => (
                  <Button key={item} onClick={() => handleSectorChange(item)} variant={draft.sector === item ? "default" : "outline"}>
                    {getSectorLabel(item)}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Nome do produto</label>
                  <Input
                    onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)}
                    placeholder="Ex.: Tênis casual premium"
                    ref={nameInputRef}
                    value={draft.name}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["SKU automático", generatedCodes.sku, "gerado pelo setor + nome + subcategoria"],
                      ["Código interno", generatedCodes.internalCode, "uso operacional e conferência local"],
                      ["Código de barras", generatedCodes.barcode, "gerado automaticamente para leitura"]
                    ].map(([label, value, helper]) => (
                      <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.12)] px-4 py-3" key={label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:rgba(214,190,142,0.78)]">{label}</p>
                        <p className="mt-2 break-all text-[14px] font-semibold text-slate-50">{value}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{helper}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Marca</label>
                  <select className="native-select h-11 text-sm" onChange={(event) => setDraft((current) => current ? { ...current, brandId: event.target.value } : current)} value={draft.brandId}>
                    <option value="">Selecione</option>
                    {brandOptions.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Categoria</label>
                  <select className="native-select h-11 text-sm" onChange={(event) => setDraft((current) => current ? { ...current, categoryId: event.target.value } : current)} value={draft.categoryId}>
                    <option value="">Selecione</option>
                    {sectorCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Preço custo</label>
                  <Input min={0} onChange={(event) => setDraft((current) => current ? { ...current, costPrice: Number(event.target.value) || 0 } : current)} type="number" value={draft.costPrice} />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Preço venda</label>
                  <Input min={0} onChange={(event) => setDraft((current) => current ? { ...current, salePrice: Number(event.target.value) || 0 } : current)} type="number" value={draft.salePrice} />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Cor</label>
                  <Input onChange={(event) => setDraft((current) => current ? { ...current, color: event.target.value } : current)} value={draft.color} />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Subcategoria</label>
                  <Input onChange={(event) => setDraft((current) => current ? { ...current, subcategory: event.target.value } : current)} value={draft.subcategory} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-slate-50">Grade rápida</p>
                  <p className="text-[12px] text-slate-400">Ajuste só os tamanhos que entram agora no lote.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {draft.sizes.map((entry, index) => (
                    <div
                      className={cn(
                        "premium-tile rounded-[22px] border border-[rgba(201,168,111,0.12)] px-3 py-3 transition-all",
                        entry.stock > 0
                          ? "border-[rgba(201,168,111,0.24)] bg-[linear-gradient(180deg,rgba(61,68,82,0.94),rgba(40,45,56,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_30px_-28px_rgba(0,0,0,0.5)]"
                          : "bg-[linear-gradient(180deg,rgba(45,50,61,0.9),rgba(33,37,46,0.96))]"
                      )}
                      key={entry.size}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[color:rgba(231,208,160,0.92)]">{entry.size}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            entry.stock > 0
                              ? "border border-emerald-400/18 bg-emerald-500/12 text-emerald-200"
                              : "border border-white/8 bg-black/10 text-slate-400"
                          )}
                        >
                          {entry.stock > 0 ? "ativo" : "zero"}
                        </span>
                      </div>
                      <Input
                        className="mt-3 h-[54px] rounded-[18px] border-[rgba(201,168,111,0.14)] bg-[rgba(12,16,22,0.5)] px-3 text-center text-[20px] font-semibold tracking-[0.02em] text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min={0}
                        onChange={(event) => {
                          const stock = Number(event.target.value) || 0;
                          setDraft((current) => current ? {
                            ...current,
                            sizes: current.sizes.map((item, itemIndex) => (itemIndex === index ? { ...item, stock } : item))
                          } : current);
                        }}
                        type="number"
                        value={entry.stock}
                      />
                      <p className="mt-2 text-center text-[11px] text-slate-400">estoque</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="native-scroll min-h-0 overflow-y-auto pr-1">
              <div className="flex min-h-full flex-col gap-4">
                <div className="premium-tile rounded-[24px] border border-[rgba(201,168,111,0.12)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-50">Imagem e vitrine</p>
                      <p className="mt-1 text-[12px] text-slate-400">Miniatura local sempre visível e visual ampliado ao clicar.</p>
                    </div>
                    <Badge variant="outline">{draft.imageDataUrl ? "com imagem" : "sem imagem"}</Badge>
                  </div>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    ref={photoInputRef}
                    type="file"
                  />
                  <button
                    className="group mt-4 block w-full rounded-[24px] text-left"
                    onClick={() => draft.imageDataUrl ? setImagePreviewOpen(true) : photoInputRef.current?.click()}
                    type="button"
                  >
                    <div className="relative overflow-hidden rounded-[24px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(27,31,40,0.98),rgba(18,22,30,0.985))]">
                      <ProductImagePlaceholder
                        className="h-52 transition-transform duration-200 group-hover:scale-[1.012]"
                        imageDataUrl={draft.imageDataUrl}
                        imageHint={draft.imageHint}
                        name={draft.name || "Novo produto"}
                        sector={draft.sector}
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[linear-gradient(180deg,rgba(7,10,16,0),rgba(7,10,16,0.68))] px-4 py-3">
                        <div>
                          <span className="text-[12px] font-semibold text-slate-100">
                            {draft.imageDataUrl ? "Clique para ampliar a foto" : "Clique para enviar imagem"}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-300">
                            {draft.imageDataUrl ? "visual em alta e miniatura mantida no cadastro" : "upload rápido para visual do produto"}
                          </p>
                        </div>
                        <Expand className="h-4 w-4 text-slate-200" />
                      </div>
                    </div>
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => photoInputRef.current?.click()} type="button" variant="outline">
                      <ImagePlus className="h-4 w-4" />
                      {draft.imageDataUrl ? "Trocar imagem" : "Enviar imagem"}
                    </Button>
                    {draft.imageDataUrl ? (
                      <Button onClick={handleClearImage} type="button" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["Imagem", draft.imageDataUrl ? "pronta" : "pendente", draft.imageDataUrl ? "Miniatura salva para leitura rápida." : "Enviar foto melhora catálogo e PDV."],
                    ["Identificação", issues.some((issue) => normalizeIdentifierText(issue).includes("SKU") || normalizeIdentifierText(issue).includes("CODIGO")) ? "revisar" : "ok", "SKU, interno e barras acompanham nome e descrição."],
                    ["Grade", draft.sizes.some((entry) => entry.stock > 0) ? "ativa" : "vazia", draft.sizes.some((entry) => entry.stock > 0) ? "Há tamanhos com estoque inicial." : "Defina ao menos um tamanho com estoque."]
                  ].map(([label, value, helper]) => (
                    <div className="premium-tile rounded-[22px] border border-[rgba(201,168,111,0.12)] px-4 py-3" key={label}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:rgba(214,190,142,0.78)]">{label}</p>
                      <p className="mt-2 text-[18px] font-semibold capitalize text-slate-50">{value}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">{helper}</p>
                    </div>
                  ))}
                </div>

                <ProductFormPreview
                  imageDataUrl={draft.imageDataUrl}
                  imageHint={draft.imageHint}
                  issues={issues}
                  name={draft.name}
                  sector={draft.sector}
                />

                <div className="premium-tile rounded-[22px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-50">Operação rápida</p>
                      <p className="mt-1 text-[12px] text-slate-400">Atalho global, fechamento rápido e leitura clara para balcão.</p>
                    </div>
                    <Badge variant="outline">F3 / Esc</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Use `F3` de qualquer tela, cadastre o item, salve e continue a operação. `Esc` fecha a janela sem sair da área atual.
                  </p>
                  <div className="mt-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-black/10 px-3 py-2 text-[12px] text-slate-300">
                    SKU e código de barras acompanham o nome e a descrição automaticamente.
                  </div>
                </div>

                <div className="mt-auto space-y-3 border-t border-[rgba(201,168,111,0.12)] bg-[linear-gradient(180deg,rgba(25,29,36,0),rgba(14,17,23,0.44))] pt-4">
                  {error ? <div className="system-alert system-alert--error">{error}</div> : null}
                  {feedback ? <div className="system-alert system-alert--success">{feedback}</div> : null}
                  <div className="grid gap-2">
                    <Button className="h-12 justify-center rounded-[18px] text-[15px] shadow-[0_18px_34px_-24px_rgba(217,176,106,0.42)]" disabled={saving} onClick={() => void handleSave()}>
                      <Plus className="h-4 w-4" />
                      {saving ? "Salvando..." : "Salvar produto"}
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Button className="h-11 rounded-[18px]" onClick={() => navigate("/produtos")} variant="outline">
                        Abrir catálogo completo
                      </Button>
                      <Button className="h-11 rounded-[18px] px-5" onClick={closeProductQuickRegister} variant="ghost">
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      {imagePreviewOpen && draft.imageDataUrl ? (
        <div className="absolute inset-0 z-[90] bg-[rgba(2,6,10,0.82)] backdrop-blur-[4px]">
          <div className="flex h-full items-center justify-center p-6">
            <div className="relative w-full max-w-[980px] overflow-hidden rounded-[28px] border border-[rgba(201,168,111,0.18)] bg-[linear-gradient(180deg,rgba(25,29,36,0.98),rgba(16,19,26,0.985))] shadow-[0_42px_90px_-40px_rgba(0,0,0,0.78)]">
              <div className="flex items-center justify-between gap-3 border-b border-[rgba(201,168,111,0.12)] px-5 py-4">
                <div>
                  <p className="text-[16px] font-semibold text-slate-50">{draft.name || "Imagem do produto"}</p>
                  <p className="mt-1 text-[12px] text-slate-400">Visual ampliado salvo localmente para catálogo e PDV.</p>
                </div>
                <Button onClick={() => setImagePreviewOpen(false)} size="icon" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-[radial-gradient(circle_at_top,rgba(64,106,172,0.18),transparent_52%)] p-5">
                <img alt={draft.name || "Produto"} className="max-h-[76vh] w-full rounded-[22px] object-contain" src={draft.imageDataUrl} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
