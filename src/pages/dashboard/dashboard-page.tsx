import { Link } from "react-router-dom";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { OperationalFocusPanel } from "@/components/dashboard/operational-focus-panel";
import { SalesOverviewChart } from "@/components/dashboard/sales-overview-chart";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSnapshot } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data, loading } = useDashboardSnapshot();

  if (loading || !data) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        actions={
          <>
            <Button variant="outline">Entrada de estoque</Button>
            <Button>Nova venda</Button>
          </>
        }
        badge="Operacao em tempo real"
        description="Resumo premium para abrir o dia, identificar gargalos e agir rapido nos pontos que mais mexem no caixa e no estoque."
        eyebrow="Dashboard"
        title="Controle comercial da loja"
      />

      <div className="section-rule grid gap-3 pt-4 md:grid-cols-2 2xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <StatCard helper={metric.helper} key={metric.id} label={metric.label} trend={metric.trend} value={metric.value} />
        ))}
      </div>

      <div className="section-rule grid gap-3 pt-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="executive-panel">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Painel do turno</p>
              <p className="text-[15px] font-semibold text-slate-950">Visão rápida para abrir o dia, agir no gargalo e fechar venda com leitura forte.</p>
              <p className="text-[13px] text-slate-600">Tudo no mesmo sistema de moda e calçados, com foco operacional sem navegação confusa.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="executive-chip rounded-[18px] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Area ativa</p>
                <p className="mt-1 text-[14px] font-semibold text-slate-950">Painel</p>
              </div>
              <div className="executive-chip rounded-[18px] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Offline</p>
                <p className="mt-1 text-[14px] font-semibold text-slate-950">Base local pronta</p>
              </div>
              <div className="executive-chip rounded-[18px] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Prioridade</p>
                <p className="mt-1 text-[14px] font-semibold text-slate-950">Venda + reposicao</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardContent className="grid gap-3 p-4">
            <div className="rounded-[18px] border border-border/75 bg-white/80 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Leitura do sistema</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Shell mais marcado e navegação mais clara</p>
            </div>
            <div className="rounded-[18px] border border-border/75 bg-white/80 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Operação comercial</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Atalhos, foco por setor e leitura executiva</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="section-rule pt-4">
        <OperationalFocusPanel cards={data.focusCards} />
      </div>

      <div className="section-rule grid gap-5 pt-4 2xl:grid-cols-[1.55fr_0.95fr]">
        <SalesOverviewChart data={data.salesSeries} />
        <CategoryChart data={data.categorySeries} />
      </div>

      <div className="section-rule grid gap-4 pt-4 xl:grid-cols-2 2xl:grid-cols-4">
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Estoque baixo</CardTitle>
            <CardDescription>Itens que ja merecem reposicao ou compra programada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStockProducts.slice(0, 4).map((product) => (
              <div className="flex items-center justify-between rounded-[18px] border border-border/75 bg-white/80 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" key={product.id}>
                <div>
                  <p className="text-[14px] font-semibold text-slate-950">{product.name}</p>
                  <p className="text-[12px] text-slate-600">{product.sku}</p>
                </div>
                <Badge variant="warning">{product.variants.reduce((sum, variant) => sum + variant.stock, 0)} pares</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Mais vendidos</CardTitle>
            <CardDescription>Ajuda a priorizar vitrine, compra e sugestao de venda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topProducts.map((product) => (
              <div className="rounded-[18px] border border-border/75 bg-white/80 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" key={product.id}>
                <p className="text-[14px] font-semibold text-slate-950">{product.name}</p>
                <p className="mt-1 text-[12px] text-slate-600">{product.sales30d} vendas nos ultimos 30 dias</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Pedidos recentes</CardTitle>
            <CardDescription>Fila curta, leitura limpa e status visivel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentOrders.map((order) => (
              <div className="rounded-[18px] border border-border/75 bg-white/80 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-950">{order.id}</p>
                    <p className="text-[12px] text-slate-600">{formatDate(order.updatedAt)}</p>
                  </div>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
                <p className="mt-2.5 text-[12px] text-slate-600">{formatCurrency(order.value)} • {order.items} itens</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Clientes recentes</CardTitle>
            <CardDescription>Ajuda o atendimento a reconhecer perfil e oportunidade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentCustomers.map((customer) => (
              <div className="rounded-[18px] border border-border/75 bg-white/80 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" key={customer.id}>
                <p className="text-[14px] font-semibold text-slate-950">{customer.name}</p>
                <p className="mt-1 text-[12px] text-slate-600">Ultima compra {formatDate(customer.lastPurchaseAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="section-rule executive-panel pt-4">
        <CardHeader>
          <CardTitle>Atalhos rapidos</CardTitle>
          <CardDescription>Acoes mais usadas sem poluicao visual.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.quickActions.map((action) => (
            <Link className="block rounded-[18px] border border-border/80 bg-white/78 px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-slate-300 hover:bg-secondary/40" key={action.id} to={action.path}>
              <p className="text-[14px] font-semibold text-slate-950">{action.label}</p>
              <p className="mt-1 text-[12px] text-slate-600">{action.description}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
