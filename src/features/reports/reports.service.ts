import { getFinanceReference } from "@/features/finance/finance.service";
import type { PrintPreviewSection } from "@/features/printing/printing.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ChartPoint, Customer, FinancialEntry, Product, ReportsSnapshot, Sale } from "@/types/domain";

export type ReportPeriod = "7d" | "30d" | "90d";

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

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias"
};

function getPeriodStartDate(period: ReportPeriod, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const windowSize = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  start.setDate(start.getDate() - (windowSize - 1));
  return start;
}

export function buildReportHighlights(snapshot: ReportsSnapshot) {
  const topChannel = [...snapshot.salesByChannel].sort((a, b) => b.value - a.value)[0];
  const topCustomer = snapshot.bestCustomers[0];
  const dormantCount = snapshot.dormantProducts.length;
  const financialPeak = [...snapshot.financialBalance].sort((a, b) => b.value - a.value)[0];

  return [
    { label: "Canal dominante", value: `${topChannel?.label ?? "N/D"} ${topChannel?.value ?? 0}%`, helper: "Leitura rápida do principal motor de vendas" },
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
    { id: "exp-2", title: "Compras e giro", description: "Leitura para reposição, produtos parados e categorias com pressão de estoque." },
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

export function getReportPeriodLabel(period: ReportPeriod) {
  return PERIOD_LABELS[period];
}

export function filterSalesByPeriod(sales: Sale[], period: ReportPeriod, referenceDate = new Date()) {
  const startDate = getPeriodStartDate(period, referenceDate).getTime();
  return sales.filter((sale) => new Date(sale.createdAt).getTime() >= startDate);
}

export function filterFinancialEntriesByPeriod(entries: FinancialEntry[], period: ReportPeriod, referenceDate = new Date()) {
  const startDate = getPeriodStartDate(period, referenceDate).getTime();
  return entries.filter((entry) => new Date(entry.dueAt).getTime() >= startDate);
}

export function buildReportsSnapshotForPeriod(
  products: Product[],
  customers: Customer[],
  sales: Sale[],
  financialEntries: FinancialEntry[],
  period: ReportPeriod,
  referenceDate = new Date()
): ReportsSnapshot {
  const filteredSales = filterSalesByPeriod(sales, period, referenceDate);
  const filteredEntries = filterFinancialEntriesByPeriod(financialEntries, period, referenceDate);
  const unitsByProduct = new Map<string, number>();
  const salesByCustomer = new Map<string, { total: number; count: number; lastPurchaseAt: string }>();

  for (const sale of filteredSales) {
    for (const item of sale.items) {
      unitsByProduct.set(item.productId, (unitsByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    if (!sale.customerId) {
      continue;
    }

    const current = salesByCustomer.get(sale.customerId) ?? { total: 0, count: 0, lastPurchaseAt: sale.createdAt };
    salesByCustomer.set(sale.customerId, {
      total: current.total + sale.total,
      count: current.count + 1,
      lastPurchaseAt: current.lastPurchaseAt > sale.createdAt ? current.lastPurchaseAt : sale.createdAt
    });
  }

  const periodProducts = products.map((product) => ({
    ...product,
    sales30d: unitsByProduct.get(product.id) ?? 0
  }));

  const periodCustomers = customers.map((customer) => {
    const metrics = salesByCustomer.get(customer.id);
    if (!metrics) {
      return {
        ...customer,
        lifetimeValue: 0,
        averageTicket: 0
      };
    }

    return {
      ...customer,
      lifetimeValue: metrics.total,
      averageTicket: metrics.count > 0 ? metrics.total / metrics.count : 0,
      lastPurchaseAt: metrics.lastPurchaseAt
    };
  });

  return buildReportsSnapshotFromData(periodProducts, periodCustomers, filteredSales, filteredEntries);
}

export function buildReportExportSection(input: {
  presetId: string;
  snapshot: ReportsSnapshot;
  period: ReportPeriod;
  companyName: string;
  filteredSales: Sale[];
  filteredEntries: FinancialEntry[];
}): PrintPreviewSection {
  const { presetId, snapshot, period, companyName, filteredSales, filteredEntries } = input;
  const periodLabel = getReportPeriodLabel(period);
  const topChannel = [...snapshot.salesByChannel].sort((a, b) => b.value - a.value)[0];
  const topCustomer = snapshot.bestCustomers[0];
  const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const receivables = filteredEntries.filter((entry) => entry.type === "receber").reduce((sum, entry) => sum + entry.amount, 0);
  const payables = filteredEntries.filter((entry) => entry.type === "pagar").reduce((sum, entry) => sum + entry.amount, 0);
  const overdueValue = filteredEntries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.amount, 0);
  const dormantProducts = rankDormantProducts(snapshot.dormantProducts);

  if (presetId === "exp-2") {
    return {
      id: "report-products",
      title: companyName,
      subtitle: `Compras e giro · ${periodLabel}`,
      lines: [
        `Produtos com baixo giro: ${dormantProducts.length}`,
        ...dormantProducts.slice(0, 5).map((product) => `${product.name} · ${product.sales30d} venda(s) · SKU ${product.sku}`),
        `Cliente de maior valor no recorte: ${topCustomer?.name ?? "Nao identificado"}`
      ],
      totals: [
        { label: "Vendas no periodo", value: formatCurrency(totalSalesValue) },
        { label: "Receber mapeado", value: formatCurrency(receivables) },
        { label: "Pagar mapeado", value: formatCurrency(payables) }
      ],
      footer: `Gerado em ${formatDate(new Date().toISOString())}`
    };
  }

  if (presetId === "exp-3") {
    const financeOrigins = filteredEntries.reduce<Record<string, number>>((accumulator, entry) => {
      const origin = getFinanceReference(entry).label;
      accumulator[origin] = (accumulator[origin] ?? 0) + 1;
      return accumulator;
    }, {});

    return {
      id: "report-finance",
      title: companyName,
      subtitle: `Financeiro consolidado · ${periodLabel}`,
      lines: [
        `Lancamentos no recorte: ${filteredEntries.length}`,
        ...snapshot.financialBalance.map((item) => `${item.label}: ${formatCurrency(item.value)}`),
        ...Object.entries(financeOrigins).map(([label, count]) => `${label}: ${count} lançamento(s)`),
        `Canal comercial mais forte: ${topChannel?.label ?? "Nao identificado"}`
      ],
      totals: [
        { label: "A receber", value: formatCurrency(receivables) },
        { label: "A pagar", value: formatCurrency(payables) },
        { label: "Em atraso", value: formatCurrency(overdueValue) }
      ],
      footer: `Gerado em ${formatDate(new Date().toISOString())}`
    };
  }

  return {
    id: "report-summary",
    title: companyName,
    subtitle: `Resumo gerencial · ${periodLabel}`,
    lines: [
      `Cupons no recorte: ${filteredSales.length}`,
      `Canal lider: ${topChannel?.label ?? "Nao identificado"}${topChannel ? ` · ${topChannel.value}%` : ""}`,
      `Cliente destaque: ${topCustomer?.name ?? "Nao identificado"}`,
      `Produtos parados: ${snapshot.dormantProducts.length}`
    ],
    totals: [
      { label: "Faturamento", value: formatCurrency(totalSalesValue) },
      { label: "Receber", value: formatCurrency(receivables) },
      { label: "Pagar", value: formatCurrency(payables) }
    ],
    footer: `Gerado em ${formatDate(new Date().toISOString())}`
  };
}

export function buildReportExportText(input: {
  presetId: string;
  snapshot: ReportsSnapshot;
  period: ReportPeriod;
  companyName: string;
  filteredSales: Sale[];
  filteredEntries: FinancialEntry[];
}) {
  const section = buildReportExportSection(input);
  return [section.title, section.subtitle, ...section.lines, ...(section.totals ?? []).map((row) => `${row.label}: ${row.value}`), section.footer ?? ""]
    .filter(Boolean)
    .join("\n");
}
