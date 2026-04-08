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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrders, useProducts, useSales, useSettingsSnapshot, useStockSnapshot } from "@/hooks/use-app-data";
import { buildPrintCenterSnapshot, openPrintPreview } from "@/features/printing/printing.service";

export default function PrintingPage() {
  const settingsState = useSettingsSnapshot();
  const productsState = useProducts();
  const salesState = useSales();
  const ordersState = useOrders();
  const stockState = useStockSnapshot();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-58");
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

  if (loading || !center) {
    return <PageLoader />;
  }

  const centerSnapshot = center;
  const selectedTemplate = centerSnapshot.templates.find((template) => template.id === selectedTemplateId) ?? centerSnapshot.templates[0];
  const preview = centerSnapshot.previews[selectedTemplate.id];
  const readyCount = centerSnapshot.readiness.filter((item) => item.status === "ok").length;
  const pendingJobs = centerSnapshot.jobs.filter((job) => !job.status.toLowerCase().includes("controle") && !job.status.toLowerCase().includes("sob controle")).length;

  function handlePrint(templateId: string) {
    const section = centerSnapshot.previews[templateId];
    if (!section) {
      setFeedback("Nao foi possivel montar o preview deste layout.");
      return;
    }

    const opened = openPrintPreview(section);
    setFeedback(opened ? `Preview aberto para ${section.title}.` : "O navegador bloqueou a janela de preview. Permita pop-up para testar impressao.");
  }

  async function handleCopyPreview() {
    const content = [preview.title, preview.subtitle, ...preview.lines, ...(preview.totals ?? []).map((row) => `${row.label}: ${row.value}`), preview.footer ?? ""].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setFeedback("Conteudo do preview copiado para a area de transferencia.");
    } catch {
      setFeedback("Nao foi possivel copiar automaticamente. Use o preview para conferir o layout.");
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Centro de impressao offline-first"
        description="Mega lote focado em cupom 58/80, etiqueta, separacao e fechamento com preview local, dispositivos padrao e fila operacional mais forte."
        eyebrow="Impressao"
        title="Central de layouts e dispositivos"
      />

      {feedback ? (
        <Card className="border-primary/20 bg-primary/5 shadow-card">
          <CardContent className="p-4 text-sm text-primary">{feedback}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          { label: "Layouts prontos", value: String(center.templates.length), helper: "58 mm, 80 mm, etiqueta e A4", icon: Printer },
          { label: "Dispositivos", value: String(center.devices.length), helper: "Mapeados com funcao operacional", icon: Sparkles },
          { label: "Fila / historico", value: String(pendingJobs), helper: "Jobs ativos ou recomendados agora", icon: ClipboardList },
          {
            label: "Prontidao",
            value: `${readyCount}/${center.readiness.length}`,
            helper: settingsState.data?.salePrintBehavior === "auto" ? "Loja configurada para abrir impressao no fechamento" : "Itens conferidos para a loja imprimir",
            icon: CheckCheck
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="border-white/80 bg-white/90" key={item.label}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <p className="font-display text-3xl font-semibold text-slate-950">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PrintPreviewPanel onCopy={() => void handleCopyPreview()} onPrint={() => handlePrint(selectedTemplate.id)} preview={preview} />
        <div className="space-y-6">
          <PrinterDevicesPanel items={centerSnapshot.devices} />
          <PrintReadinessPanel items={centerSnapshot.readiness} />
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="fila">Fila de impressao</TabsTrigger>
          <TabsTrigger value="prontidao">Prontidao</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <PrintTemplateGrid activeId={selectedTemplate.id} items={centerSnapshot.templates} onPrint={handlePrint} onSelect={setSelectedTemplateId} />
        </TabsContent>

        <TabsContent value="fila">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PrintJobTimeline items={centerSnapshot.jobs} />
            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-slate-950">Rotina recomendada</p>
                    <p className="mt-1 text-sm text-muted-foreground">Fluxo para a loja imprimir sem travar operacao nem perder padrao visual.</p>
                  </div>
                  <Badge variant="outline">offline first</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "No PDV, use 58 mm para comprovante rapido e 80 mm quando precisar de detalhamento.",
                    "Use etiquetas no recebimento para organizar grade, cor e preco antes de expor na loja.",
                    "Imprima a separacao em A4 quando houver pedido ou conferencia por setor.",
                    "No fechamento do dia, gere o resumo de caixa e a reposicao para compras."
                  ].map((text) => (
                    <div className="rounded-2xl bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground" key={text}>
                      {text}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prontidao">
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <PrintReadinessPanel items={centerSnapshot.readiness} />
            <Card className="border-white/80 bg-white/90">
              <CardContent className="space-y-4 p-6">
                <p className="font-display text-xl font-semibold text-slate-950">Padrao comercial recomendado</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/45 p-4">
                    <p className="font-semibold text-slate-950">58 mm</p>
                    <p className="mt-2 text-sm text-muted-foreground">Cupom rapido no caixa, menor consumo e velocidade para operador de balcão.</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/45 p-4">
                    <p className="font-semibold text-slate-950">80 mm</p>
                    <p className="mt-2 text-sm text-muted-foreground">Cupom detalhado, mais leitura para cliente e para conferencias especiais.</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/45 p-4">
                    <p className="font-semibold text-slate-950">Etiqueta</p>
                    <p className="mt-2 text-sm text-muted-foreground">SKU, preco, grade e setor. Ajuda muito em roupas, calcados e reposicao.</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/45 p-4">
                    <p className="font-semibold text-slate-950">A4</p>
                    <p className="mt-2 text-sm text-muted-foreground">Separacao, fechamento de caixa, relatorios internos e conferencias de estoque.</p>
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
