import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { openPrintDialog, openPrintPreview } from "@/features/printing/printing.service";
import {
  buildExportPresets,
  buildReportExportSection,
  buildReportExportText,
  buildReportHighlights,
  buildReportsSnapshotForPeriod,
  filterFinancialEntriesByPeriod,
  filterSalesByPeriod,
  getReportPeriodLabel,
  rankBestCustomers,
  rankDormantProducts,
  type ReportPeriod
} from "@/features/reports/reports.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { ReportExportPanel } from "@/components/reports/report-export-panel";
import { ReportHighlightCards } from "@/components/reports/report-highlight-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers, useFinancialEntries, useProducts, useSales, useSettingsSnapshot } from "@/hooks/use-app-data";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const { data: products, loading: loadingProducts } = useProducts();
  const { data: customers, loading: loadingCustomers } = useCustomers();
  const { data: sales, loading: loadingSales } = useSales();
  const { data: financialEntries, loading: loadingEntries } = useFinancialEntries();
  const { data: settings, loading: loadingSettings } = useSettingsSnapshot();
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loading = loadingProducts || loadingCustomers || loadingSales || loadingEntries || loadingSettings;
  const snapshot = useMemo(
    () =>
      products && customers && sales && financialEntries
        ? buildReportsSnapshotForPeriod(products, customers, sales, financialEntries, period)
        : null,
    [customers, financialEntries, period, products, sales]
  );
  const filteredSales = useMemo(() => (sales ? filterSalesByPeriod(sales, period) : []), [period, sales]);
  const filteredEntries = useMemo(() => (financialEntries ? filterFinancialEntriesByPeriod(financialEntries, period) : []), [financialEntries, period]);
  const highlights = useMemo(() => (snapshot ? buildReportHighlights(snapshot) : []), [snapshot]);
  const dormantRanking = useMemo(() => (snapshot ? rankDormantProducts(snapshot.dormantProducts) : []), [snapshot]);
  const customerRanking = useMemo(() => (snapshot ? rankBestCustomers(snapshot.bestCustomers) : []), [snapshot]);
  const exportPresets = useMemo(() => buildExportPresets(), []);
  const periodLabel = useMemo(() => getReportPeriodLabel(period), [period]);
  const topChannel = useMemo(() => (snapshot ? [...snapshot.salesByChannel].sort((a, b) => b.value - a.value)[0] : null), [snapshot]);
  const strongestBalance = useMemo(() => (snapshot ? [...snapshot.financialBalance].sort((a, b) => b.value - a.value)[0] : null), [snapshot]);

  if (loading || !snapshot || !settings) {
    return <PageLoader />;
  }

  const resolvedSnapshot = snapshot;
  const resolvedSettings = settings;

  function handlePreviewExport(presetId: string) {
    const section = buildReportExportSection({
      presetId,
      snapshot: resolvedSnapshot,
      period,
      companyName: resolvedSettings.companyName,
      filteredSales,
      filteredEntries
    });
    const opened = openPrintPreview(section);
    setFeedback(opened ? "Preview do relatório aberto para conferência local." : "O preview do relatório foi bloqueado. Libere pop-up para continuar.");
  }

  function handlePrintExport(presetId: string) {
    const section = buildReportExportSection({
      presetId,
      snapshot: resolvedSnapshot,
      period,
      companyName: resolvedSettings.companyName,
      filteredSales,
      filteredEntries
    });
    const opened = openPrintDialog(section);
    setFeedback(opened ? "Diálogo de impressão do Windows aberto para o relatório." : "A janela de impressão foi bloqueada. Libere pop-up para continuar.");
  }

  async function handleCopyExport(presetId: string) {
    const content = buildReportExportText({
      presetId,
      snapshot: resolvedSnapshot,
      period,
      companyName: resolvedSettings.companyName,
      filteredSales,
      filteredEntries
    });

    try {
      await navigator.clipboard.writeText(content);
      setFeedback("Resumo do relatório copiado para a área de transferência.");
    } catch {
      setFeedback("Não foi possível copiar o relatório automaticamente. Use o preview para conferência.");
    }
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        badge="Exportacao preparada"
        description="Relatórios mais curtos para decidir venda, mix e caixa sem excesso visual."
        eyebrow="Relatórios"
        title="Analise comercial"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <div className="section-rule pt-4">
        <ReportHighlightCards cards={highlights} />
      </div>

      <Card className="section-rule executive-panel pt-4">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="text-[13px] text-slate-400">Recorte analítico real com base em {periodLabel.toLowerCase()}</div>
          <select className="native-select h-10 text-[13px]" onChange={(event) => setPeriod(event.target.value as ReportPeriod)} value={period}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </CardContent>
      </Card>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas">
          <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="surface-rule">
              <CardHeader>
                <CardTitle>Vendas por canal</CardTitle>
                <CardDescription>Mostra rapidamente onde está o giro operacional em {periodLabel.toLowerCase()}.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={snapshot.salesByChannel}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <YAxis axisLine={false} tickFormatter={(value) => `${value}%`} tickLine={false} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="value" fill="#475569" radius={[14, 14, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <ReportExportPanel onCopy={handleCopyExport} onPrint={handlePrintExport} onPreview={handlePreviewExport} periodLabel={periodLabel} presets={exportPresets} />
          </div>
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Período</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{period.toUpperCase()}</p>
                <p className="mt-1 text-[12px] text-slate-400">{periodLabel}.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Canal líder</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{topChannel?.label ?? "N/D"}</p>
                <p className="mt-1 text-[12px] text-slate-400">{topChannel ? `${topChannel.value}% do mix.` : "Sem destaque."}</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Cupons no período</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{filteredSales.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Base real do recorte.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Bloco financeiro</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{strongestBalance ? formatCurrency(strongestBalance.value) : "—"}</p>
                <p className="mt-1 text-[12px] text-slate-400">{strongestBalance?.label ?? "Sem destaque."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <div className="section-rule grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {dormantRanking.map((product) => (
              <Card className="premium-tile" key={product.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] font-semibold text-slate-50">{product.name}</p>
                    <Badge variant="warning">baixo giro</Badge>
                  </div>
                  <p className="text-[12px] text-slate-400">{product.sales30d} venda(s) no período</p>
                  <p className="text-[12px] text-slate-400">SKU {product.sku}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="section-rule grid gap-4 pt-4 xl:grid-cols-3 2xl:grid-cols-5">
            {customerRanking.map((customer) => (
              <Card className="premium-tile" key={customer.id}>
                <CardContent className="space-y-3 p-4">
                  <p className="text-[14px] font-semibold text-slate-50">{customer.name}</p>
                  <p className="text-[12px] text-slate-400">Lifetime {formatCurrency(customer.lifetimeValue)}</p>
                  <p className="text-[12px] text-slate-400">Ticket médio {formatCurrency(customer.averageTicket)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="financeiro">
          <div className="section-rule grid gap-4 pt-4 md:grid-cols-3">
            {snapshot.financialBalance.map((item) => (
              <Card className="premium-tile" key={item.label}>
                <CardContent className="space-y-2 p-4">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="font-display text-[24px] font-semibold text-slate-50">{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
