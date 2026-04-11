import type { Customer, Order } from "@/types/domain";

export interface OrderSummaryCard {
  label: string;
  value: string;
  helper: string;
}

export interface OrderTimelineEvent {
  id: string;
  title: string;
  description: string;
  tone: "default" | "success" | "warning";
}

export interface OrderPriorityItem {
  id: string;
  customerName: string;
  status: string;
  totalLabel: string;
  ageLabel: string;
  priority: "alta" | "media" | "baixa";
}

export function getOrderPriorityLabel(priority: OrderPriorityItem["priority"]) {
  if (priority === "alta") return "Prioridade alta";
  if (priority === "media") return "Prioridade média";
  return "Prioridade baixa";
}

export function getOrderStatusLabel(status: Order["status"]) {
  switch (status) {
    case "novo":
      return "Novo";
    case "em separacao":
      return "Em separação";
    case "pronto":
      return "Pronto";
    case "entregue":
      return "Entregue";
    case "cancelado":
      return "Cancelado";
    default:
      return status;
  }
}

export function buildOrderSummary(orders: Order[]) {
  const openOrders = orders.filter((order) => order.status === "novo" || order.status === "em separacao").length;
  const readyOrders = orders.filter((order) => order.status === "pronto").length;
  const deliveredOrders = orders.filter((order) => order.status === "entregue").length;
  const totalValue = orders.reduce((sum, order) => sum + order.value, 0);

  const cards: OrderSummaryCard[] = [
    { label: "Pedidos abertos", value: String(openOrders), helper: "Aguardando separação ou andamento" },
    { label: "Prontos", value: String(readyOrders), helper: "Já podem ser retirados ou expedidos" },
    { label: "Entregues", value: String(deliveredOrders), helper: "Concluídos no recorte atual" },
    { label: "Valor em pedidos", value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Carteira operacional monitorada" }
  ];

  return cards;
}

export function filterOrders(orders: Order[], query: string, status: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    const matchesQuery = normalizedQuery.length === 0 || [order.id, order.status].join(" ").toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

export function buildOrderPriorityList(orders: Order[], customers: Customer[]): OrderPriorityItem[] {
  const customerMap = Object.fromEntries(customers.map((customer) => [customer.id, customer.name]));

  return [...orders]
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .map((order) => {
      const hoursOpen = Math.max((Date.now() - new Date(order.updatedAt).getTime()) / 36e5, 1);
      const priority: OrderPriorityItem["priority"] = order.status === "novo" || hoursOpen > 24 ? "alta" : order.status === "em separacao" ? "media" : "baixa";

      return {
        id: order.id,
        customerName: customerMap[order.customerId] ?? order.customerId,
        status: getOrderStatusLabel(order.status),
        totalLabel: order.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        ageLabel: `Há ${Math.floor(hoursOpen)}h sem nova ação`,
        priority
      };
    })
    .slice(0, 5);
}

export function buildOrderTimeline(order: Order | undefined, customers: Customer[]): OrderTimelineEvent[] {
  if (!order) {
    return [];
  }

  const customer = customers.find((item) => item.id === order.customerId);
  return [
    { id: `${order.id}-1`, title: "Pedido registrado", description: `Cliente ${customer?.name ?? "não identificado"} entrou na fila operacional.`, tone: "default" },
    { id: `${order.id}-2`, title: "Separação iniciada", description: `Pedido com ${order.items} itens em conferência interna.`, tone: order.status === "novo" ? "warning" : "default" },
    { id: `${order.id}-3`, title: "Pagamento validado", description: `Valor total de ${order.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`, tone: "success" },
    { id: `${order.id}-4`, title: "Status atual", description: `Pedido marcado como ${getOrderStatusLabel(order.status)}.`, tone: order.status === "pronto" || order.status === "entregue" ? "success" : "warning" }
  ];
}
