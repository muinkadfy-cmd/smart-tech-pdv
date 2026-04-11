import type { FinancialEntry } from "@/types/domain";

export interface FinanceSummaryCard {
  label: string;
  value: string;
  helper: string;
}

export interface FinanceAgingItem {
  id: string;
  title: string;
  amount: string;
  tone: "default" | "warning" | "destructive" | "success";
  helper: string;
}

export interface CashSnapshot {
  projectedCash: string;
  openReceivables: string;
  openPayables: string;
  warningLabel: string;
}

export interface FinanceReference {
  origin: "pedido" | "compra" | "venda" | "manual";
  label: string;
  code?: string;
}

export interface FinanceOperationalSummary {
  overdueCount: number;
  overdueReceivables: number;
  overduePayables: number;
  linkedOrdersCount: number;
  linkedPurchasesCount: number;
  dueTodayCount: number;
}

export interface FinanceReconciliationItem {
  id: string;
  title: string;
  helper: string;
  amount: string;
  dueAt: string;
  tone: "default" | "warning" | "destructive" | "success";
}

export function getFinanceReference(entry: FinancialEntry): FinanceReference {
  const normalized = entry.description.toLowerCase();

  if (normalized.startsWith("pedido ")) {
    const code = entry.description.split(" ")[1];
    return { origin: "pedido", label: "Pedido", code };
  }

  if (normalized.startsWith("compra ")) {
    const code = entry.description.split(" ")[1];
    return { origin: "compra", label: "Compra", code };
  }

  if (normalized.startsWith("venda ")) {
    const code = entry.description.split(" ")[1];
    return { origin: "venda", label: "Venda", code };
  }

  return { origin: "manual", label: "Manual" };
}

export function buildFinanceOperationalSummary(entries: FinancialEntry[], referenceDate = new Date()): FinanceOperationalSummary {
  const today = new Date(referenceDate);
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date(referenceDate);
  todayStart.setHours(0, 0, 0, 0);

  const overdueEntries = entries.filter((entry) => entry.status !== "pago" && new Date(entry.dueAt).getTime() < todayStart.getTime());
  const dueToday = entries.filter((entry) => {
    const dueAt = new Date(entry.dueAt).getTime();
    return entry.status !== "pago" && dueAt >= todayStart.getTime() && dueAt <= today.getTime();
  });

  return {
    overdueCount: overdueEntries.length,
    overdueReceivables: overdueEntries.filter((entry) => entry.type === "receber").reduce((sum, entry) => sum + entry.amount, 0),
    overduePayables: overdueEntries.filter((entry) => entry.type === "pagar").reduce((sum, entry) => sum + entry.amount, 0),
    linkedOrdersCount: entries.filter((entry) => getFinanceReference(entry).origin === "pedido").length,
    linkedPurchasesCount: entries.filter((entry) => getFinanceReference(entry).origin === "compra").length,
    dueTodayCount: dueToday.length
  };
}

export function buildFinanceReconciliationQueue(entries: FinancialEntry[], referenceDate = new Date()) {
  const now = referenceDate.getTime();

  return entries
    .filter((entry) => entry.status !== "pago")
    .map((entry): FinanceReconciliationItem => {
      const reference = getFinanceReference(entry);
      const dueAt = new Date(entry.dueAt).getTime();
      const overdue = dueAt < now;
      return {
        id: entry.id,
        title: entry.description,
        helper: `${reference.label}${reference.code ? ` ${reference.code}` : ""} • ${entry.type === "receber" ? "Recebimento" : "Pagamento"} • vencimento ${new Date(entry.dueAt).toLocaleDateString("pt-BR")}`,
        amount: entry.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        dueAt: entry.dueAt,
        tone: overdue ? "destructive" : entry.status === "atrasado" ? "warning" : "default"
      };
    })
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
    .slice(0, 6);
}

export function buildFinanceSummary(entries: FinancialEntry[]) {
  const receivables = entries.filter((entry) => entry.type === "receber").reduce((sum, entry) => sum + entry.amount, 0);
  const payables = entries.filter((entry) => entry.type === "pagar").reduce((sum, entry) => sum + entry.amount, 0);
  const overdue = entries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.amount, 0);
  const paid = entries.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.amount, 0);

  return [
    { label: "A receber", value: receivables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Carteira prevista de entrada" },
    { label: "A pagar", value: payables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Compromissos em aberto e já pagos" },
    { label: "Em atraso", value: overdue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Títulos que pedem ação imediata" },
    { label: "Movido como pago", value: paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Fluxo já conciliado" }
  ] as FinanceSummaryCard[];
}

export function filterFinanceEntries(entries: FinancialEntry[], type: string, status: string) {
  return entries.filter((entry) => (type === "all" || entry.type === type) && (status === "all" || entry.status === status));
}

export function buildFinanceAging(entries: FinancialEntry[]): FinanceAgingItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.description,
    amount: entry.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    tone: entry.status === "atrasado" ? "destructive" : entry.status === "aberto" ? "warning" : "success",
    helper: `${entry.type === "receber" ? "Recebimento" : "Pagamento"} com vencimento em ${new Date(entry.dueAt).toLocaleDateString("pt-BR")}`
  }));
}

export function buildCashSnapshot(entries: FinancialEntry[]): CashSnapshot {
  const receivables = entries.filter((entry) => entry.type === "receber" && entry.status !== "atrasado").reduce((sum, entry) => sum + entry.amount, 0);
  const payables = entries.filter((entry) => entry.type === "pagar" && entry.status !== "pago").reduce((sum, entry) => sum + entry.amount, 0);
  const projected = receivables - payables;

  return {
    projectedCash: projected.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    openReceivables: receivables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    openPayables: payables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    warningLabel: projected < 0 ? "Fluxo projetado negativo" : "Fluxo projetado sob controle"
  };
}
