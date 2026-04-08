import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildExportPresets, buildReportHighlights, rankBestCustomers, rankDormantProducts } from "@/features/reports/reports.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { ReportExportPanel } from "@/components/reports/report-export-panel";
import { ReportHighlightCards } from "@/components/reports/report-highlight-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReportsSnapshot } from "@/hooks/use-app-data";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const { data, loading } = useReportsSnapshot();
  const [period, setPeriod] = useState("30d");
  const snapshot = data;

  const highlights = useMemo(() => (snapshot ? buildReportHighlights(snapshot) : []), [snapshot]);
  const dormantRanking = useMemo(() => (snapshot ? rankDormantProducts(snapshot.dormantProducts) : []), [snapshot]);
  const customerRanking = useMemo(() => (snapshot ? rankBestCustomers(snapshot.bestCustomers) : []), [snapshot]);
  const exportPresets = useMemo(() => buildExportPresets(), []);
  const topChannel = useMemo(() => (snapshot ? [...snapshot.salesByChannel].sort((a, b) => b.value - a.value)[0] : null), [snapshot]);
  const strongestBalance = useMemo(() => (snapshot ? [...snapshot.financialBalance].sort((a, b) => b.value - a.value)[0] : null), [snapshot]);

  if (loading || !snapshot) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        badge="Exportacao preparada"
        description="Relatorios com leitura mais executiva, ranking e indicadores para decidir venda, reposicao e caixa sem excesso visual."
        eyebrow="Relatorios"
        title="Analise comercial"
      />

      <div className="section-rule pt-4">
        <ReportHighlightCards cards={highlights} />
      </div>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Leitura analítica</p>
            <p className="text-[15px] font-semibold text-slate-950">Os blocos mostram decisão rápida sem afogar o operador em números soltos.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Período</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{period.toUpperCase()}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Canal líder</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{topChannel?.label ?? "N/D"}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ação rápida</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Exportar + decidir mix</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="section-rule grid gap-3 pt-4 xl:grid-cols-[1fr_1fr_1fr_1.1fr]">
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Janela de análise</p><p className="font-display text-[24px] font-semibold text-slate-950">{period.toUpperCase()}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">Recorte rápido para operação e gestão.</p></CardContent></Card>
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Canal dominante</p><p className="font-display text-[24px] font-semibold text-slate-950">{topChannel?.label ?? "N/D"}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">{topChannel ? `${topChannel.value}% do mix analisado.` : "Sem canal dominante no recorte."}</p></CardContent></Card>
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Produtos parados</p><p className="font-display text-[24px] font-semibold text-slate-950">{dormantRanking.length}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">Itens pedindo campanha, giro ou corte.</p></CardContent></Card>
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Maior bloco financeiro</p><p className="font-display text-[24px] font-semibold text-slate-950">{strongestBalance ? formatCurrency(strongestBalance.value) : "—"}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">{strongestBalance?.label ?? "Sem destaque financeiro no recorte."}</p></CardContent></Card>
      </div>

      <Card className="section-rule surface-rule border-white/80 bg-white/92 pt-4">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="text-[13px] text-slate-600">Recorte analítico do período selecionado</div>
          <select className="native-select h-10 text-[13px]" onChange={(event) => setPeriod(event.target.value)} value={period}>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
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
            <Card className="surface-rule border-white/80 bg-white/92">
              <CardHeader>
                <CardTitle>Vendas por canal</CardTitle>
                <CardDescription>Mostra rapidamente onde está o giro operacional no recorte {period}.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={snapshot.salesByChannel}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <YAxis axisLine={false} tickFormatter={(value) => `${value}%`} tickLine={false} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="value" fill="#2563EB" radius={[14, 14, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <ReportExportPanel presets={exportPresets} />
          </div>
        </TabsContent>

        <TabsContent value="produtos">
          <div className="section-rule grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
            {dormantRanking.map((product) => (
              <Card className="surface-rule border-white/80 bg-white/92" key={product.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] font-semibold text-slate-950">{product.name}</p>
                    <Badge variant="warning">baixo giro</Badge>
                  </div>
                  <p className="text-[12px] text-slate-600">{product.sales30d} vendas nos últimos 30 dias</p>
                  <p className="text-[12px] text-slate-600">SKU {product.sku}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="section-rule grid gap-4 pt-4 xl:grid-cols-5">
            {customerRanking.map((customer) => (
              <Card className="surface-rule border-white/80 bg-white/92" key={customer.id}>
                <CardContent className="space-y-3 p-4">
                  <p className="text-[14px] font-semibold text-slate-950">{customer.name}</p>
                  <p className="text-[12px] text-slate-600">Lifetime {formatCurrency(customer.lifetimeValue)}</p>
                  <p className="text-[12px] text-slate-600">Ticket médio {formatCurrency(customer.averageTicket)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="financeiro">
          <div className="section-rule grid gap-4 pt-4 md:grid-cols-3">
            {snapshot.financialBalance.map((item) => (
              <Card className="surface-rule border-white/80 bg-white/92" key={item.label}>
                <CardContent className="space-y-2 p-4">
                  <p className="text-[12px] uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="font-display text-[24px] font-semibold text-slate-950">{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
