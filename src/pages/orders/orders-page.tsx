import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Search, Truck } from "lucide-react";
import { buildOrderPriorityList, buildOrderSummary, buildOrderTimeline, filterOrders } from "@/features/orders/order.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { OrderPriorityList } from "@/components/orders/order-priority-list";
import { OrderSummaryCards } from "@/components/orders/order-summary-cards";
import { OrderTimelinePanel } from "@/components/orders/order-timeline-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCustomers, useOrders } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

const priorityGuides = [
  { id: "guide-1", title: "Separar pedidos novos", description: "Pedidos novos ou sem ação recente devem entrar primeiro no fluxo do dia.", icon: Clock3 },
  { id: "guide-2", title: "Confirmar prontos", description: "Itens prontos precisam sair do estoque ou ser avisados ao cliente rapidamente.", icon: CheckCircle2 },
  { id: "guide-3", title: "Destravar atrasados", description: "Pedidos sem atualização por muitas horas merecem contato ou revisão interna.", icon: AlertTriangle }
] as const;

export default function OrdersPage() {
  const { data: ordersData, loading: loadingOrders } = useOrders();
  const { data: customersData, loading: loadingCustomers } = useCustomers();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const orders = ordersData ?? [];
  const customers = customersData ?? [];
  const loading = loadingOrders || loadingCustomers;

  const customerMap = useMemo(() => Object.fromEntries(customers.map((customer) => [customer.id, customer.name])), [customers]);
  const filteredOrders = useMemo(() => filterOrders(orders, query, status), [orders, query, status]);
  const cards = useMemo(() => buildOrderSummary(filteredOrders), [filteredOrders]);
  const activeOrder = useMemo(() => filteredOrders.find((order) => order.id === selectedOrderId) ?? filteredOrders[0], [filteredOrders, selectedOrderId]);
  const timeline = useMemo(() => buildOrderTimeline(activeOrder, customers), [activeOrder, customers]);
  const priorityItems = useMemo(() => buildOrderPriorityList(filteredOrders, customers), [filteredOrders, customers]);
  const openOrders = useMemo(() => filteredOrders.filter((order) => order.status === "novo" || order.status === "em separacao"), [filteredOrders]);
  const readyOrders = useMemo(() => filteredOrders.filter((order) => order.status === "pronto"), [filteredOrders]);
  const deliveredValue = useMemo(() => filteredOrders.filter((order) => order.status === "entregue").reduce((sum, order) => sum + order.value, 0), [filteredOrders]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Timeline pronta para expandir"
        description="Pedidos organizados com mais leitura executiva: fila, prioridade, status e timeline sem transformar tudo em uma unica grade longa."
        eyebrow="Pedidos"
        title="Acompanhamento operacional"
      />

      <OrderSummaryCards cards={cards} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.8fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fila viva</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{openOrders.length}</p>
            <p className="text-sm text-muted-foreground">Pedidos esperando andamento agora.</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prontos para liberar</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{readyOrders.length}</p>
            <p className="text-sm text-muted-foreground">Pedidos que já podem sair do balcão ou da expedição.</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Valor entregue</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{formatCurrency(deliveredValue)}</p>
            <p className="text-sm text-muted-foreground">Receita já concluída dentro do recorte filtrado.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-secondary/45 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por codigo do pedido, status ou cliente" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">Todos status</option>
            <option value="novo">Novo</option>
            <option value="em separacao">Em separacao</option>
            <option value="pronto">Pronto</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Fila de pedidos</CardTitle>
              <CardDescription>Status, cliente, valor e ultima movimentacao em ordem de prioridade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isActive = activeOrder?.id === order.id;

                  return (
                    <button className={`w-full rounded-2xl p-4 text-left transition ${isActive ? "bg-slate-950 text-white" : "bg-secondary/45"}`} key={order.id} onClick={() => setSelectedOrderId(order.id)} type="button">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${isActive ? "text-white" : "text-slate-950"}`}>{order.id}</p>
                          <p className={`text-sm ${isActive ? "text-slate-300" : "text-muted-foreground"}`}>{customerMap[order.customerId] ?? "Cliente nao identificado"}</p>
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
                <div className="empty-state-box text-sm">Nenhum pedido caiu nesse filtro. Mantenha o recorte em “Todos status” para visualizar a carteira completa.</div>
              )}
            </CardContent>
          </Card>

          <OrderPriorityList items={priorityItems} />
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
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
                        <p className="mt-2 text-sm text-slate-300">{customerMap[activeOrder.customerId] ?? "Cliente nao identificado"}</p>
                      </div>
                      <Badge className="border-white/10 bg-white/10 text-white" variant="outline">
                        {activeOrder.status}
                      </Badge>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
                        <p className="mt-2 text-lg font-semibold">{formatCurrency(activeOrder.value)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Itens</p>
                        <p className="mt-2 text-lg font-semibold">{activeOrder.items}</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Última ação</p>
                        <p className="mt-2 text-sm font-semibold">{formatDate(activeOrder.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Próxima ação recomendada</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {activeOrder.status === "novo" ? "Iniciar separação" : activeOrder.status === "em separacao" ? "Conferir e marcar como pronto" : activeOrder.status === "pronto" ? "Acionar retirada ou entrega" : "Arquivar no histórico"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Canal operacional</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
                        <Truck className="h-4 w-4" />
                        Balcão, retirada e expedição no mesmo fluxo
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-secondary/45 p-5 text-sm text-muted-foreground">Selecione um pedido para ver o painel detalhado e a timeline.</div>
              )}
            </CardContent>
          </Card>

          <OrderTimelinePanel events={timeline} />

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Guia rápido do turno</CardTitle>
              <CardDescription>Três focos que deixam a operação mais enxuta no dia a dia.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {priorityGuides.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="rounded-2xl bg-secondary/45 p-4" key={item.id}>
                    <div className="flex items-center gap-2 text-slate-950">
                      <Icon className="h-4 w-4" />
                      <p className="font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
