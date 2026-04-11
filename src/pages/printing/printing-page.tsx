import { useEffect, useMemo, useState } from "react";
import { CheckCheck, ClipboardList, Printer, Sparkles } from "lucide-react";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { PrintJobTimeline } from "@/components/printing/print-job-timeline";
import { PrintPreviewPanel } from "@/components/printing/print-preview-panel";
import { PrintReadinessPanel } from "@/components/printing/print-readiness-panel";
import { PrintTemplateGrid } from "@/components/printing/print-template-grid";
import { PrinterDevicesPanel } from "@/components/printing/printer-devices-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders, useProducts, useSales, useSettingsSnapshot, useStockSnapshot } from "@/hooks/use-app-data";
import { appRepository } from "@/repositories/app-repository";
import { buildPrintCenterSnapshot, buildProductLabelPrintPreview, openPrintDialog, openPrintPreview } from "@/features/printing/printing.service";

export default function PrintingPage() {
  const settingsState = useSettingsSnapshot();
  const productsState = useProducts();
  const salesState = useSales();
  const ordersState = useOrders();
  const stockState = useStockSnapshot();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-58");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productQuery, setProductQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loading = settingsState.loading || productsState.loading || salesState.loading || ordersState.loading || stockState.loading;
  const hasData = settingsState.data && productsState.data && salesState.data && ordersState.data && stockState.data;

  const center = useMemo(() => {
    if (!hasData) {
      return null;
    }

    return buildPrintCenterSnapshot({
      settings: settingsState.data!,
      products: productsState.data!,
      sales: salesState.data!,
      orders: ordersState.data!,
      stockSnapshot: stockState.data!
    });
  }, [hasData, settingsState.data, productsState.data, salesState.data, ordersState.data, stockState.data]);

  useEffect(() => {
    if (center && !center.templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(center.templates[0]?.id ?? "tpl-58");
    }
  }, [center, selectedTemplateId]);

  const filteredProducts = useMemo(() => {
    const normalized = productQuery.trim().toLowerCase();
    const base = productsState.data ?? [];
    if (!normalized) {
      return base;
    }

    return base.filter((product) => [product.name, product.sku, product.barcode, product.internalCode].join(" ").toLowerCase().includes(normalized));
  }, [productQuery, productsState.data]);

  useEffect(() => {
    if (!filteredProducts.length) {
      return;
    }

    if (!filteredProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedProductId]);

  if (loading || !center) {
    return <PageLoader />;
  }

  const centerSnapshot = center;
  const selectedTemplate = centerSnapshot.templates.find((template) => template.id === selectedTemplateId) ?? centerSnapshot.templates[0];
  const selectedProduct = filteredProducts.find((product) => product.id === selectedProductId) ?? filteredProducts[0] ?? productsState.data?.[0];
  const preview = selectedTemplate.id === "tpl-label" || selectedTemplate.id === "tpl-stock"
    ? selectedProduct
      ? buildProductLabelPrintPreview({
          settings: {
            ...settingsState.data!,
            defaultLabelTemplate: selectedTemplate.id === "tpl-stock" ? "tpl-stock" : "tpl-label"
          },
          product: selectedProduct
        })
      : centerSnapshot.previews[selectedTemplate.id]
    : centerSnapshot.previews[selectedTemplate.id];
  const readyCount = centerSnapshot.readiness.filter((item) => item.status === "ok").length;
  const pendingJobs = centerSnapshot.jobs.filter((job) => !job.status.toLowerCase().includes("controle") && !job.status.toLowerCase().includes("sob controle")).length;

  function buildSectionForTemplate(templateId: string) {
    return (templateId === "tpl-label" || templateId === "tpl-stock") && selectedProduct
      ? buildProductLabelPrintPreview({
          settings: {
            ...settingsState.data!,
            defaultLabelTemplate: templateId === "tpl-stock" ? "tpl-stock" : "tpl-label"
          },
          product: selectedProduct
        })
      : centerSnapshot.previews[templateId];
  }

  function handlePrint(templateId: string, mode: "preview" | "dialog" = "dialog") {
    const section = buildSectionForTemplate(templateId);
    if (!section) {
      setFeedback("Não foi possível montar o preview deste layout.");
      return;
    }

    const opened = mode === "dialog" ? openPrintDialog(section) : openPrintPreview(section);
    setFeedback(
      opened
        ? mode === "dialog"
          ? `Janela de impressão enviada ao Windows para ${section.title}. Confirme a impressora conectada no diálogo do sistema.`
          : `Preview aberto para ${section.title}.`
        : `O sistema bloqueou a janela de ${mode === "dialog" ? "impressão" : "preview"}. Permita pop-up para continuar.`
    );
  }

  async function handleCopyPreview() {
    const content = [preview.title, preview.subtitle, ...preview.lines, ...(preview.totals ?? []).map((row) => `${row.label}: ${row.value}`), preview.footer ?? ""].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setFeedback("Conteúdo do preview copiado para a área de transferência.");
    } catch {
      setFeedback("Não foi possível copiar automaticamente. Use o preview para conferir o layout.");
    }
  }

  async function handleSetDefaultPrinter(templateId: "tpl-58" | "tpl-80") {
    try {
      await appRepository.updateSettings({ defaultSalePrintTemplate: templateId, salePrintBehavior: "auto" });
      await settingsState.reload();
      setFeedback(`Impressora padrão do caixa ajustada para ${templateId === "tpl-80" ? "80 mm" : "58 mm"}. O PDV passa a abrir o diálogo do Windows automaticamente no fechamento.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar a impressora padrão.");
    }
  }

  function resolveTemplateIdFromDevice(deviceType: string) {
    if (deviceType === "80 mm") return "tpl-80";
    if (deviceType === "Etiqueta") return "tpl-label";
    if (deviceType === "A4") return "tpl-stock";
    return "tpl-58";
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Centro de impressão offline-first"
        description="Impressão mais direta para testar layout, dispositivo e fila sem alongar a tela."
        eyebrow="Impressão"
        title="Central de layouts e dispositivos"
      />

      {feedback ? (
        <Card className="surface-rule shadow-card">
          <CardContent className="p-4 text-sm text-slate-200">{feedback}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {[
          { label: "Layouts prontos", value: String(center.templates.length), helper: "Cupom, etiqueta e apoio operacional", icon: Printer },
          { label: "Dispositivos", value: String(center.devices.length), helper: "Térmicas mapeadas para o fluxo comercial", icon: Sparkles },
          { label: "Fila / histórico", value: String(pendingJobs), helper: "Jobs ativos ou recomendados agora", icon: ClipboardList },
          {
            label: "Prontidão",
            value: `${readyCount}/${center.readiness.length}`,
            helper: settingsState.data?.salePrintBehavior === "auto" ? "Loja configurada para abrir impressão no fechamento" : "Itens conferidos para a loja imprimir",
            icon: CheckCheck
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="executive-panel" key={item.label}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="font-display text-3xl font-semibold text-slate-50">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="surface-rule">
        <CardContent className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-50">Fluxo real da impressão nesta versão</p>
            <p className="text-sm text-slate-400">
              O app monta o layout localmente e entrega a impressão ao diálogo do Windows. O nome da impressora salvo indica o alvo preferido do layout, mas ainda não existe envio silencioso nativo direto para USB ou Bluetooth.
            </p>
          </div>
          <div className="rounded-[18px] border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
            Se sua máquina já está conectada, use <span className="font-semibold text-slate-50">Imprimir agora</span> ou <span className="font-semibold text-slate-50">Testar impressão</span> e confirme o dispositivo no diálogo do Windows.
          </div>
        </CardContent>
      </Card>

      {(selectedTemplate.id === "tpl-label" || selectedTemplate.id === "tpl-stock") ? (
        <Card className="surface-rule">
          <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-50">Selecionar produto para etiqueta</p>
              <Input onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar por nome, SKU, código interno ou código de barras" value={productQuery} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Produto em foco</p>
              <select className="native-select h-11 w-full text-sm" onChange={(event) => setSelectedProductId(event.target.value)} value={selectedProduct?.id ?? ""}>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} • {product.sku}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PrintPreviewPanel onCopy={() => void handleCopyPreview()} onOpenPreview={() => handlePrint(selectedTemplate.id, "preview")} onPrint={() => handlePrint(selectedTemplate.id, "dialog")} preview={preview} />
        <div className="space-y-6">
          <PrinterDevicesPanel items={centerSnapshot.devices} onPrint={(item) => handlePrint(resolveTemplateIdFromDevice(item.type), "dialog")} onSetDefault={(item) => void handleSetDefaultPrinter(item.type === "80 mm" ? "tpl-80" : "tpl-58")} />
          <PrintReadinessPanel items={centerSnapshot.readiness} />
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="fila">Fila de impressão</TabsTrigger>
          <TabsTrigger value="prontidao">Prontidão</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <PrintTemplateGrid activeId={selectedTemplate.id} items={centerSnapshot.templates} onPrint={(templateId) => handlePrint(templateId, "dialog")} onSelect={setSelectedTemplateId} />
        </TabsContent>

        <TabsContent value="fila">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PrintJobTimeline items={centerSnapshot.jobs} />
            <Card className="executive-panel">
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <div className="premium-tile rounded-[18px] p-4 text-sm leading-6 text-slate-400">No PDV, use 58 mm para comprovante rápido e 80 mm quando precisar de detalhamento.</div>
                <div className="premium-tile rounded-[18px] p-4 text-sm leading-6 text-slate-400">Defina 58 mm ou 80 mm como padrão do fluxo e evite troca manual no balcão.</div>
                <div className="premium-tile rounded-[18px] p-4 text-sm leading-6 text-slate-400">Fluxo direto do caixa prioriza térmica e reduz ruído visual para a equipe.</div>
                <div className="premium-tile rounded-[18px] p-4 text-sm leading-6 text-slate-400">Quando precisar revisar, use preview; quando a loja estiver pronta, deixe o fluxo direto configurado.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prontidao">
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <PrintReadinessPanel items={centerSnapshot.readiness} />
            <Card className="executive-panel">
              <CardContent className="space-y-4 p-6">
                <p className="font-display text-xl font-semibold text-slate-50">Padrão comercial recomendado</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="premium-tile rounded-2xl p-4">
                    <p className="font-semibold text-slate-50">58 mm</p>
                    <p className="mt-2 text-sm text-muted-foreground">Cupom rápido no caixa, menor consumo e velocidade para operador de balcão.</p>
                  </div>
                  <div className="premium-tile rounded-2xl p-4">
                    <p className="font-semibold text-slate-50">80 mm</p>
                    <p className="mt-2 text-sm text-muted-foreground">Cupom detalhado, mais leitura para cliente e para conferências especiais.</p>
                  </div>
                  <div className="premium-tile rounded-2xl p-4 md:col-span-2">
                    <p className="font-semibold text-slate-50">Padrão recomendado</p>
                    <p className="mt-2 text-sm text-muted-foreground">Use 58 mm como padrão em balcão rápido e 80 mm quando a loja precisar de cupom mais detalhado. O restante fica fora do fluxo principal de venda.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
