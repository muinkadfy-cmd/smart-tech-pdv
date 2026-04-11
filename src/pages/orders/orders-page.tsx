import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Search, Truck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { buildOrderPriorityList, buildOrderSummary, buildOrderTimeline, filterOrders } from "@/features/orders/order.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { OrderPriorityList } from "@/components/orders/order-priority-list";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { OrderSummaryCards } from "@/components/orders/order-summary-cards";
import { OrderTimelinePanel } from "@/components/orders/order-timeline-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCustomers, useFinancialEntries, useOrders } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { confirmAction } from "@/lib/confirm-action";
import { appRepository } from "@/repositories/app-repository";
import type { OrderStatus } from "@/types/domain";

interface OrdersRouteState {
  query?: string;
}

const priorityGuides = [
  { id: "guide-1", title: "Separar pedidos novos", description: "Pedidos novos ou sem ação recente devem entrar primeiro no fluxo do dia.", icon: Clock3 },
  { id: "guide-2", title: "Confirmar prontos", description: "Itens prontos precisam sair do estoque ou ser avisados ao cliente rápidamente.", icon: CheckCircle2 },
  { id: "guide-3", title: "Destravar atrasados", description: "Pedidos sem atualização por muitas horas merecem contato ou revisão interna.", icon: AlertTriangle }
] as const;

function getAvailableOrderTransitions(status: OrderStatus) {
  if (status === "novo") {
    return [
      { status: "em separacao" as const, label: "Iniciar separação", variant: "default" as const },
      { status: "cancelado" as const, label: "Cancelar", variant: "destructive" as const }
    ];
  }

  if (status === "em separacao") {
    return [
      { status: "pronto" as const, label: "Marcar pronto", variant: "default" as const },
      { status: "cancelado" as const, label: "Cancelar", variant: "destructive" as const }
    ];
  }

  if (status === "pronto") {
    return [
      { status: "entregue" as const, label: "Marcar entregue", variant: "default" as const },
      { status: "cancelado" as const, label: "Cancelar", variant: "destructive" as const }
    ];
  }

  if (status === "cancelado") {
    return [{ status: "novo" as const, label: "Reabrir pedido", variant: "outline" as const }];
  }

  return [];
}

export default function OrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: ordersData, loading: loadingOrders, reload: reloadOrders } = useOrders();
  const { data: customersData, loading: loadingCustomers } = useCustomers();
  const { data: financialEntries, loading: loadingFinancialEntries, reload: reloadFinancialEntries } = useFinancialEntries();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const orders = ordersData ?? [];
  const customers = customersData ?? [];
  const loading = loadingOrders || loadingCustomers || loadingFinancialEntries;

  const customerMap = useMemo(() => Object.fromEntries(customers.map((customer) => [customer.id, customer.name])), [customers]);
  const filteredOrders = useMemo(() => filterOrders(orders, query, status), [orders, query, status]);
  const cards = useMemo(() => buildOrderSummary(filteredOrders), [filteredOrders]);
  const activeOrder = useMemo(() => filteredOrders.find((order) => order.id === selectedOrderId) ?? filteredOrders[0], [filteredOrders, selectedOrderId]);
  const timeline = useMemo(() => buildOrderTimeline(activeOrder, customers), [activeOrder, customers]);
  const priorityItems = useMemo(() => buildOrderPriorityList(filteredOrders, customers), [filteredOrders, customers]);
  const openOrders = useMemo(() => filteredOrders.filter((order) => order.status === "novo" || order.status === "em separacao"), [filteredOrders]);
  const readyOrders = useMemo(() => filteredOrders.filter((order) => order.status === "pronto"), [filteredOrders]);
  const cancelledOrders = useMemo(() => filteredOrders.filter((order) => order.status === "cancelado"), [filteredOrders]);
  const deliveredValue = useMemo(() => filteredOrders.filter((order) => order.status === "entregue").reduce((sum, order) => sum + order.value, 0), [filteredOrders]);
  const statusActions = useMemo(() => (activeOrder ? getAvailableOrderTransitions(activeOrder.status) : []), [activeOrder]);
  const linkedFinancialEntry = useMemo(
    () =>
      activeOrder && financialEntries
        ? financialEntries.find((entry) => entry.description.toLowerCase().includes(activeOrder.id.toLowerCase()))
        : undefined,
    [activeOrder, financialEntries]
  );

  useEffect(() => {
    const routeState = location.state as OrdersRouteState | null;
    if (routeState?.query) {
      setQuery(routeState.query);
    }
  }, [location.state]);

  if (loading) {
    return <PageLoader />;
  }

  async function handleOrderStatusUpdate(nextStatus: OrderStatus) {
    if (!activeOrder) {
      return;
    }

    const availableStatuses = getAvailableOrderTransitions(activeOrder.status).map((item) => item.status);
    if (!availableStatuses.includes(nextStatus)) {
      setFeedback(`O pedido ${activeOrder.id} não pode ir de ${activeOrder.status} para ${nextStatus} nesse fluxo.`);
      return;
    }

    const confirmed = confirmAction(`Atualizar o pedido ${activeOrder.id} para "${nextStatus}"? Essa mudança entra na trilha local de auditoria.`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateOrderStatus(activeOrder.id, nextStatus);
      reloadOrders();
      setFeedback(`Pedido ${activeOrder.id} atualizado para ${nextStatus}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o pedido.");
    }
  }

  async function handleCreateOrderReceivable() {
    if (!activeOrder) {
      return;
    }

    if (linkedFinancialEntry) {
      setFeedback(`O pedido ${activeOrder.id} já possui lançamento financeiro vinculado.`);
      return;
    }

    const customerName = customerMap[activeOrder.customerId] ?? "Cliente não identificado";
    const confirmed = confirmAction(`Gerar cobrança do pedido ${activeOrder.id} no financeiro?`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createFinancialEntry({
        type: "receber",
        description: `Pedido ${activeOrder.id} - ${customerName}`,
        amount: activeOrder.value,
        status: "aberto",
        dueAt: new Date(activeOrder.updatedAt).toISOString()
      });
      reloadFinancialEntries();
      setFeedback(`Cobrança do pedido ${activeOrder.id} enviada para o financeiro.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível gerar a cobrança do pedido.");
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Timeline pronta para expandir"
        compact
        description="Pedidos mais diretos para localizar, mudar status e liberar rápido o que já pode sair."
        eyebrow="Pedidos"
        title="Acompanhamento operacional"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <OrderSummaryCards cards={cards} />

      <Card className="executive-panel">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código do pedido, status ou cliente" value={query} />
          </div>
          <select className="native-select h-11 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">Todos status</option>
            <option value="novo">Novo</option>
            <option value="em separacao">Em separação</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="panel-block rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Fila viva</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{openOrders.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Esperando andamento.</p>
              </div>
              <div className="panel-block rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Prontos</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{readyOrders.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Liberáveis agora.</p>
              </div>
              <div className="panel-block rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">Valor entregue</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{formatCurrency(deliveredValue)}</p>
                <p className="mt-1 text-[12px] text-slate-400">Receita concluída.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Fila de pedidos</CardTitle>
              <CardDescription>Status, cliente, valor e última movimentação em ordem de prioridade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isActive = activeOrder?.id === order.id;

                  return (
                    <button className={`w-full rounded-2xl p-4 text-left transition ${isActive ? "border border-[rgba(201,168,111,0.16)] bg-[linear-gradient(180deg,rgba(18,21,28,0.98),rgba(12,15,22,1))] text-white shadow-[0_18px_28px_-24px_rgba(0,0,0,0.56)]" : "premium-tile"}`} key={order.id} onClick={() => setSelectedOrderId(order.id)} type="button">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${isActive ? "text-white" : "text-slate-50"}`}>{order.id}</p>
                          <p className={`text-sm ${isActive ? "text-slate-300" : "text-muted-foreground"}`}>{customerMap[order.customerId] ?? "Cliente não identificado"}</p>
                        </div>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className={`mt-3 flex flex-wrap gap-4 text-sm ${isActive ? "text-slate-300" : "text-muted-foreground"}`}>
                        <span>{formatCurrency(order.value)}</span>
                        <span>{order.items} itens</span>
                        <span>{formatDate(order.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="empty-state-box text-sm">Nenhum pedido caiu nesse filtro. Mantenha o recorte em "Todos status" para visualizar a carteira completa.</div>
              )}
            </CardContent>
          </Card>

          <OrderPriorityList items={priorityItems} />
        </div>

        <div className="space-y-6">
          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Painel do pedido</CardTitle>
              <CardDescription>Resumo rápido para o operador agir sem abrir outra aba.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeOrder ? (
                <>
                  <div className="rounded-3xl bg-slate-950 p-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pedido em foco</p>
                        <p className="mt-2 font-display text-3xl font-semibold">{activeOrder.id}</p>
                        <p className="mt-2 text-sm text-slate-300">{customerMap[activeOrder.customerId] ?? "Cliente não identificado"}</p>
                      </div>
                      <Badge className="border-white/10 bg-white/10 text-white" variant="outline">
                        {activeOrder.status}
                      </Badge>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
                        <p className="mt-2 text-lg font-semibold">{formatCurrency(activeOrder.value)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Itens</p>
                        <p className="mt-2 text-lg font-semibold">{activeOrder.items}</p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Última ação</p>
                        <p className="mt-2 text-sm font-semibold">{formatDate(activeOrder.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="premium-tile rounded-2xl p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Próxima ação recomendada</p>
                      <p className="mt-2 text-sm font-semibold text-slate-50">
                        {activeOrder.status === "novo"
                          ? "Iniciar separação"
                          : activeOrder.status === "em separacao"
                            ? "Conferir e marcar como pronto"
                            : activeOrder.status === "pronto"
                              ? "Acionar retirada ou entrega"
                              : activeOrder.status === "cancelado"
                                ? "Revisar exceção e decidir reabertura"
                                : "Arquivar no histórico"}
                      </p>
                    </div>
                    <div className="premium-tile rounded-2xl p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Canal operacional</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-50">
                        <Truck className="h-4 w-4" />
                        Balcão, retirada e expedição no mesmo fluxo
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="premium-tile rounded-2xl p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Financeiro do pedido</p>
                      <p className="mt-2 text-sm font-semibold text-slate-50">
                        {linkedFinancialEntry ? `${linkedFinancialEntry.status} • ${formatCurrency(linkedFinancialEntry.amount)}` : "Sem cobrança gerada"}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {linkedFinancialEntry ? linkedFinancialEntry.description : "Gere a cobrança quando o pedido precisar entrar no fluxo financeiro."}
                      </p>
                    </div>
                    <div className="premium-tile rounded-2xl p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Atalho administrativo</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={() => void handleCreateOrderReceivable()} size="sm" variant="outline">
                          {linkedFinancialEntry ? "Cobrança já gerada" : "Gerar cobrança"}
                        </Button>
                        <Button
                          onClick={() =>
                            navigate("/financeiro", {
                              state: {
                                query: activeOrder.id,
                                draft: {
                                  type: "receber",
                                  description: `Pedido ${activeOrder.id} - ${customerMap[activeOrder.customerId] ?? "Cliente não identificado"}`,
                                  amount: activeOrder.value,
                                  dueAt: new Date(activeOrder.updatedAt).toISOString(),
                                  status: "aberto"
                                },
                                feedback: `Financeiro preparado para o pedido ${activeOrder.id}.`
                              }
                            })
                          }
                          size="sm"
                          variant="outline"
                        >
                          Abrir no financeiro
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] p-3 md:grid-cols-2 xl:grid-cols-3">
                    {statusActions.map((action) => (
                      <Button
                        key={action.status}
                        onClick={() => void handleOrderStatusUpdate(action.status)}
                        size="sm"
                        variant={action.variant}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[12px] text-slate-400">
                    O fluxo libera apenas a próxima ação segura do pedido para evitar salto indevido de status.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className={buttonVariants({ size: "sm" })} to="/impressao">
                      Imprimir separação
                    </Link>
                    <Link className={buttonVariants({ size: "sm", variant: "outline" })} to={activeOrder.status === "novo" ? "/pdv" : "/estoque"}>
                      {activeOrder.status === "novo" ? "Voltar ao PDV" : "Acompanhar no estoque"}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="premium-tile rounded-2xl p-5 text-sm text-muted-foreground">Selecione um pedido para ver o painel detalhado e a timeline.</div>
              )}
            </CardContent>
          </Card>

          <OrderTimelinePanel events={timeline} />
          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Excecoes do turno</CardTitle>
              <CardDescription>Pedidos cancelados ou que pedem revisão antes de voltar para a fila.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="premium-tile rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cancelados</p>
                <p className="mt-2 font-display text-3xl font-semibold text-slate-50">{cancelledOrders.length}</p>
                <p className="mt-2 text-sm text-slate-400">Saem da fila principal e ficam prontos para reabertura controlada.</p>
              </div>
              <div className="premium-tile rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Radar do turno</p>
                <p className="mt-2 text-sm font-semibold text-slate-50">{cancelledOrders.length > 0 ? "Existe exceção pedindo revisão da equipe." : "Sem excecoes pesadas no recorte atual."}</p>
                <p className="mt-2 text-sm text-slate-400">Use o status do pedido para cancelar, reabrir ou concluir sem deixar ruido na fila.</p>
              </div>
            </CardContent>
          </Card>
          <RecentAreaAuditPanel
            area="Pedidos"
            description="Mudancas de status e decisoes de expedicao mais recentes."
            emptyMessage="As proximas alteracoes de pedido vao aparecer aqui."
            title="Últimas acoes da fila"
          />
        </div>
      </div>
    </div>
  );
}
