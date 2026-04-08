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

export function buildFinanceSummary(entries: FinancialEntry[]) {
  const receivables = entries.filter((entry) => entry.type === "receber").reduce((sum, entry) => sum + entry.amount, 0);
  const payables = entries.filter((entry) => entry.type === "pagar").reduce((sum, entry) => sum + entry.amount, 0);
  const overdue = entries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.amount, 0);
  const paid = entries.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.amount, 0);

  return [
    { label: "A receber", value: receivables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Carteira prevista de entrada" },
    { label: "A pagar", value: payables.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Compromissos em aberto e pagos" },
    { label: "Em atraso", value: overdue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Titulos que pedem acao imediata" },
    { label: "Movido como pago", value: paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Fluxo ja conciliado" }
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
