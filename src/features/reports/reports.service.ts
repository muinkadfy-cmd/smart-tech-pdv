import type { ChartPoint, Customer, FinancialEntry, Product, ReportsSnapshot, Sale } from "@/types/domain";

export interface ReportHighlightCard {
  label: string;
  value: string;
  helper: string;
}

export interface ExportPreset {
  id: string;
  title: string;
  description: string;
}

export function buildReportHighlights(snapshot: ReportsSnapshot) {
  const topChannel = [...snapshot.salesByChannel].sort((a, b) => b.value - a.value)[0];
  const topCustomer = snapshot.bestCustomers[0];
  const dormantCount = snapshot.dormantProducts.length;
  const financialPeak = [...snapshot.financialBalance].sort((a, b) => b.value - a.value)[0];

  return [
    { label: "Canal dominante", value: `${topChannel?.label ?? "N/D"} ${topChannel?.value ?? 0}%`, helper: "Leitura rapida do principal motor de vendas" },
    { label: "Cliente destaque", value: topCustomer?.name ?? "N/D", helper: "Maior lifetime value no recorte" },
    { label: "Produtos parados", value: String(dormantCount), helper: "Itens que pedem acao comercial" },
    { label: "Pico financeiro", value: financialPeak ? `${financialPeak.label} ${financialPeak.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "N/D", helper: "Maior concentracao no bloco financeiro" }
  ] as ReportHighlightCard[];
}

export function rankDormantProducts(products: Product[]) {
  return [...products].sort((a, b) => a.sales30d - b.sales30d).slice(0, 5);
}

export function rankBestCustomers(customers: Customer[]) {
  return [...customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 5);
}

export function buildExportPresets(): ExportPreset[] {
  return [
    { id: "exp-1", title: "Resumo gerencial", description: "Pacote rapido para fechamento semanal com vendas, clientes e caixa." },
    { id: "exp-2", title: "Compras e giro", description: "Leitura para reposicao, produtos parados e categorias com pressao de estoque." },
    { id: "exp-3", title: "Financeiro consolidado", description: "Recorte de receber, pagar e atrasos para acompanhamento administrativo." }
  ];
}


function normalizeLabel(input: string) {
  return input.trim() || "Nao identificado";
}

function getChannelLabel(methods: Sale["paymentMethods"]) {
  if (methods.includes("Pix")) return "Pix";
  if (methods.includes("Cartao")) return "Cartao";
  if (methods.includes("Crediario")) return "Crediario";
  if (methods.includes("Dinheiro")) return "Dinheiro";
  return "Balcao";
}

export function buildReportsSnapshotFromData(products: Product[], customers: Customer[], sales: Sale[], financialEntries: FinancialEntry[]): ReportsSnapshot {
  const totalSales = sales.length;
  const salesByChannelMap = new Map<string, number>();
  for (const sale of sales) {
    const label = getChannelLabel(sale.paymentMethods);
    salesByChannelMap.set(label, (salesByChannelMap.get(label) ?? 0) + 1);
  }

  const salesByChannel: ChartPoint[] = Array.from(salesByChannelMap.entries()).map(([label, count]) => ({
    label,
    value: totalSales === 0 ? 0 : Math.round((count / totalSales) * 100)
  }));

  const bestCustomers = [...customers]
    .map((customer) => {
      const salesForCustomer = sales.filter((sale) => sale.customerId === customer.id);
      const totalValue = salesForCustomer.reduce((sum, sale) => sum + sale.total, 0);
      const averageTicket = salesForCustomer.length ? totalValue / salesForCustomer.length : customer.averageTicket;
      const lastPurchaseAt = salesForCustomer[0]?.createdAt ?? customer.lastPurchaseAt;
      return {
        ...customer,
        averageTicket,
        lifetimeValue: Math.max(customer.lifetimeValue, totalValue),
        lastPurchaseAt
      };
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, 5);

  const dormantProducts = [...products].sort((a, b) => a.sales30d - b.sales30d || a.name.localeCompare(b.name)).slice(0, 8);

  const balanceMap = new Map<string, number>();
  for (const entry of financialEntries) {
    const label = entry.type === "receber" ? normalizeLabel(entry.status === "pago" ? "Recebido" : "A receber") : normalizeLabel(entry.status === "pago" ? "Pago" : "A pagar");
    balanceMap.set(label, (balanceMap.get(label) ?? 0) + entry.amount);
  }

  const financialBalance: ChartPoint[] = Array.from(balanceMap.entries()).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));

  return {
    salesByChannel: salesByChannel.length ? salesByChannel : [{ label: "Sem vendas", value: 0 }],
    dormantProducts,
    bestCustomers,
    financialBalance: financialBalance.length ? financialBalance : [{ label: "Sem lancamentos", value: 0 }]
  };
}
