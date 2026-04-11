import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Box, CircleAlert, Sparkles, Target, Wallet } from "lucide-react";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { OperationalFocusPanel } from "@/components/dashboard/operational-focus-panel";
import { SalesOverviewChart } from "@/components/dashboard/sales-overview-chart";
import { buildFinanceOperationalSummary } from "@/features/finance/finance.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSnapshot, useFinancialEntries, usePurchases, useSettingsSnapshot } from "@/hooks/use-app-data";
import { canAccessNavigationItem, filterQuickActionsForProfile, getDefaultRole, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { navigationItems } from "@/routes/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

const quickActionIcons: Record<string, typeof Box> = {
  "/pdv": Sparkles,
  "/estoque": Box,
  "/financeiro": Wallet,
  "/pedidos": CircleAlert,
  "/clientes": Target,
  "/relatorios": Target
};

export default function DashboardPage() {
  const { data, loading } = useDashboardSnapshot();
  const settingsState = useSettingsSnapshot();
  const financeState = useFinancialEntries();
  const purchasesState = usePurchases();
  const navigate = useNavigate();

  if (loading || !data || settingsState.loading || !settingsState.data || financeState.loading || purchasesState.loading || !financeState.data || !purchasesState.data) {
    return <PageLoader />;
  }

  const currentRole = settingsState.data.currentUserRole ?? getDefaultRole();
  const activeLocalUser = resolveActiveLocalUserProfile(settingsState.data.localUsers, settingsState.data.activeLocalUserId);
  const defaultQuickActions = [
    { id: "qa-fallback-pdv", label: "Nova venda", description: "Abre o PDV com foco em teclado e fechamento rápido.", path: "/pdv" },
    { id: "qa-fallback-stock", label: "Entrada de estoque", description: "Receba lote, ajuste saldo e reforce vitrine sem sair da operação.", path: "/estoque" },
    { id: "qa-fallback-finance", label: "Cobranças do dia", description: "Vá direto para vencimentos, recebíveis e caixa prioritário.", path: "/financeiro" },
    { id: "qa-fallback-orders", label: "Separar pedidos", description: "Abra a fila para separar, cobrar e liberar o que já pode sair.", path: "/pedidos" }
  ];
  const quickActions = filterQuickActionsForProfile(
    [...data.quickActions, ...defaultQuickActions.filter((action) => !data.quickActions.some((entry) => entry.path === action.path))],
    navigationItems,
    activeLocalUser,
    currentRole
  );
  const canAccessPath = (path: string) => {
    const item = navigationItems.find((entry) => entry.path === path);
    return item ? canAccessNavigationItem(item, currentRole, activeLocalUser) : true;
  };
  const financeSummary = buildFinanceOperationalSummary(financeState.data);
  const openPurchases = purchasesState.data.filter((purchase) => purchase.status !== "recebida");
  const openPurchaseValue = openPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const leadingCategory = [...data.categorySeries].sort((left, right) => right.value - left.value)[0];
  const topProduct = [...data.topProducts].sort((left, right) => (right.sales30d ?? 0) - (left.sales30d ?? 0))[0];
  const latestOrder = [...data.recentOrders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const latestCustomer = [...data.recentCustomers].sort((left, right) => new Date(right.lastPurchaseAt).getTime() - new Date(left.lastPurchaseAt).getTime())[0];
  const overdueTotal = financeState.data.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.amount, 0);
  const dueTodayCount = financeState.data.filter((entry) => entry.status === "aberto" && new Date(entry.dueAt).getTime() <= Date.now()).length;
  const resolvedFocusCards = [
    ...data.focusCards,
    ...(data.focusCards.some((card) => card.actionPath === "/estoque")
      ? []
      : [{ id: "focus-fallback-stock", title: "Reposição em destaque", description: `${data.lowStockProducts.length} SKU(s) pedem atenção para não perder giro no salão.`, tone: data.lowStockProducts.length > 0 ? "warning" as const : "success" as const, actionLabel: "Abrir estoque", actionPath: "/estoque" }]),
    ...(data.focusCards.some((card) => card.actionPath === "/financeiro")
      ? []
      : [{ id: "focus-fallback-finance", title: "Cobrança no radar", description: dueTodayCount > 0 || overdueTotal > 0 ? `${dueTodayCount} título(s) vencendo ou atrasado(s), com ${formatCurrency(overdueTotal)} em pressão financeira.` : "Caixa sem pressão crítica agora. Aproveite para manter conciliações em dia.", tone: dueTodayCount > 0 || overdueTotal > 0 ? "warning" as const : "success" as const, actionLabel: "Abrir financeiro", actionPath: "/financeiro" }]),
    ...(data.focusCards.some((card) => card.actionPath === "/compras")
      ? []
      : [{ id: "focus-fallback-purchases", title: "Compra e abastecimento", description: openPurchases.length > 0 ? `${openPurchases.length} compra(s) em aberto aguardando recebimento ou conferência.` : "Sem compra pendente agora. Bom momento para revisar giro e negociar o próximo lote.", tone: openPurchases.length > 0 ? "default" as const : "success" as const, actionLabel: "Abrir compras", actionPath: "/compras" }])
  ].filter((card) => canAccessPath(card.actionPath));
  const priorityKpis = [
    {
      label: "Meta do turno",
      value: data.metrics[0]?.value ?? "--",
      helper: "Indicador principal para acompanhar venda e reação do time."
    },
    {
      label: "Pressão do caixa",
      value: formatCurrency(overdueTotal),
      helper: "Títulos vencidos pedindo cobrança ou renegociação."
    },
    {
      label: "Categoria líder",
      value: leadingCategory ? `${leadingCategory.label} · ${leadingCategory.value}%` : "Sem leitura",
      helper: "Mix que mais sustenta giro e vitrine no recorte atual."
    }
  ];

  return (
    <div className="space-y-5">
      <ModuleHeader
        compact
        actions={
          <>
            {canAccessPath("/estoque") ? (
              <Button onClick={() => navigate("/estoque", { state: { initialTab: "movimentar", movementType: "entrada" } })} variant="outline">
                Entrada de estoque
              </Button>
            ) : null}
            {canAccessPath("/pdv") ? <Button onClick={() => navigate("/pdv")}>Nova venda</Button> : null}
          </>
        }
        badge="Operação em tempo real"
        description="Resumo direto para abrir o dia, agir no gargalo e ir rápido para venda, estoque ou atendimento."
        eyebrow="Painel"
        title="Controle comercial da loja"
      />

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="executive-panel overflow-hidden">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(214,190,142,0.82)]">Pulso do dia</p>
                <p className="mt-2 font-display text-[32px] font-semibold leading-tight text-slate-50 sm:text-[36px]">
                  {data.metrics[0]?.value ?? "--"}
                </p>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-400">
                  {data.metrics[0]?.helper ?? "Leitura principal para abrir a operação com prioridade comercial."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {priorityKpis.map((kpi) => (
                  <div className="premium-tile rounded-[18px] px-3.5 py-3" key={kpi.label}>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{kpi.label}</p>
                    <p className="mt-1 text-[15px] font-semibold text-slate-50">{kpi.value}</p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-400">{kpi.helper}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-[22px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(39,44,54,0.98),rgba(29,33,42,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_30px_-30px_rgba(0,0,0,0.6)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(214,190,142,0.82)]">Leitura do turno</p>
                <p className="mt-2 text-[16px] font-semibold text-slate-50">{topProduct?.name ?? "Sem produto em destaque"}</p>
                <p className="mt-1 text-[13px] leading-5 text-slate-400">
                  {topProduct ? `${topProduct.sales30d ?? 0} saídas recentes no catálogo. Boa referência para vitrine e reforço de estoque.` : "Assim que a base tiver histórico mais forte, o painel destaca o produto líder aqui."}
                </p>
              </div>
              <div className="grid gap-2 text-[13px] text-slate-300">
                <div className="flex items-center justify-between gap-3 premium-tile rounded-[16px] px-3 py-2.5">
                  <span>Último pedido</span>
                  <span className="font-medium text-slate-50">{latestOrder ? formatDate(latestOrder.createdAt) : "Sem pedidos"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 premium-tile rounded-[16px] px-3 py-2.5">
                  <span>Último cliente</span>
                  <span className="font-medium text-slate-50">{latestCustomer ? `${latestCustomer.name} · ${formatDate(latestCustomer.lastPurchaseAt)}` : "Sem cadastro recente"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 premium-tile rounded-[16px] px-3 py-2.5">
                  <span>Compras em aberto</span>
                  <span className="font-medium text-slate-50">{formatCurrency(openPurchaseValue)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Atalhos rápidos</CardTitle>
            <CardDescription>Entradas mais usadas para girar entre operação, cobrança, venda e abastecimento.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.slice(0, 4).map((action) => {
              const Icon = quickActionIcons[action.path] ?? ArrowRight;
              return (
                <Link className="premium-tile block rounded-[18px] px-3.5 py-3 transition hover:border-[rgba(201,168,111,0.2)]" key={action.id} to={action.path}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] p-2">
                        <Icon className="h-4 w-4 text-[#e5d2a4]" />
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-slate-50">{action.label}</p>
                        <p className="mt-1 text-[12px] text-slate-400">{action.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-500" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="section-rule grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <StatCard helper={metric.helper} highlight={index === 0} key={metric.id} label={metric.label} trend={metric.trend} value={metric.value} />
        ))}
      </div>

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1.2fr_0.8fr]">
        <OperationalFocusPanel cards={resolvedFocusCards.slice(0, 3)} />
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Radar rápido</CardTitle>
            <CardDescription>O mínimo necessário para decidir compra, atendimento e urgência sem abrir o sistema inteiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="premium-tile rounded-[18px] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ruptura crítica</p>
                <p className="mt-1 text-[15px] font-semibold text-slate-50">{data.lowStockProducts[0]?.name ?? "Sem alerta grave"}</p>
                <p className="mt-1 text-[12px] text-slate-400">Priorize reposição ou troca de vitrine neste item.</p>
              </div>
              <div className="premium-tile rounded-[18px] px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ação sugerida</p>
                <p className="mt-1 text-[15px] font-semibold text-slate-50">{leadingCategory?.label ?? "Sem categoria líder"}</p>
                <p className="mt-1 text-[12px] text-slate-400">Reforce compra e exposição do mix que mais sustenta o giro.</p>
              </div>
            </div>
            <CategoryChart data={data.categorySeries} />
            <div className="grid gap-3">
              {data.lowStockProducts.slice(0, 3).map((product) => (
                <div className="flex items-center justify-between premium-tile rounded-[18px] px-3.5 py-3" key={product.id}>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-50">{product.name}</p>
                    <p className="text-[12px] text-slate-400">{product.sku}</p>
                  </div>
                  <Badge variant="warning">{product.variants.reduce((sum, variant) => sum + variant.stock, 0)} pares</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1fr_1fr]">
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Retaguarda financeira</CardTitle>
            <CardDescription>O mínimo necessário para cobrar, pagar e reagir sem abrir o financeiro inteiro.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Vencidos</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{financeSummary.overdueCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Receber/pagar pedindo ação.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Vence hoje</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{financeSummary.dueTodayCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Radar do administrativo.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Pedidos no financeiro</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{financeSummary.linkedOrdersCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Cobranças ligadas à operação.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Compras abertas</p>
              <p className="mt-2 font-semibold text-slate-50">{formatCurrency(openPurchaseValue)}</p>
              <p className="mt-1 text-[12px] text-slate-400">{openPurchases.length} lote(s) ainda em aberto.</p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              {canAccessPath("/financeiro") ? (
                <Button onClick={() => navigate("/financeiro", { state: { query: "pedido" } })} variant="outline">
                  Ver cobranças de pedidos
                </Button>
              ) : null}
              {canAccessPath("/compras") ? (
                <Button onClick={() => navigate("/compras")} variant="outline">
                  Ver compras abertas
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Fechamento gerencial</CardTitle>
            <CardDescription>Atalhos curtos para a loja fechar o dia sem caçar informação em várias abas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {canAccessPath("/relatorios") ? (
              <Link className="premium-tile block rounded-[18px] px-3.5 py-3" to="/relatorios">
                <p className="text-[14px] font-semibold text-slate-50">Resumo gerencial</p>
                <p className="mt-1 text-[12px] text-slate-400">Vendas, clientes, caixa e títulos em um recorte mais executivo.</p>
              </Link>
            ) : null}
            {canAccessPath("/financeiro") ? (
              <Link className="premium-tile block rounded-[18px] px-3.5 py-3" to="/financeiro" state={{ query: "compra" }}>
                <p className="text-[14px] font-semibold text-slate-50">Contas de abastecimento</p>
                <p className="mt-1 text-[12px] text-slate-400">Tudo que veio de compra e precisa ser acompanhado no pagar.</p>
              </Link>
            ) : null}
            {canAccessPath("/pedidos") ? (
              <Link className="premium-tile block rounded-[18px] px-3.5 py-3" to="/pedidos">
                <p className="text-[14px] font-semibold text-slate-50">Pedidos em carteira</p>
                <p className="mt-1 text-[12px] text-slate-400">Separação, entrega e cobrança numa rota mais curta.</p>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="section-rule executive-panel pt-4">
        <CardHeader>
          <CardTitle>Fila curta de operação</CardTitle>
          <CardDescription>O que ainda merece atenção sem abrir vários blocos ao mesmo tempo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentOrders.slice(0, 3).map((order) => (
            <div className="premium-tile rounded-[18px] p-3.5" key={order.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-slate-50">{`Pedido ${order.id.slice(0, 8)}`}</p>
                  <p className="mt-1 text-[12px] text-slate-400">Pedido {order.id.slice(0, 8)} • {order.status}</p>
                </div>
                <Badge variant="outline">{formatCurrency(order.value)}</Badge>
              </div>
              <p className="mt-3 text-[12px] text-slate-400">Atualizado em {formatDate(order.updatedAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
