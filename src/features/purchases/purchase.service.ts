import type { Purchase, Supplier } from "@/types/domain";

export interface PurchaseSummaryCard {
  label: string;
  value: string;
  helper: string;
}

export interface PurchasePipelineItem {
  id: string;
  supplierName: string;
  status: string;
  total: string;
  helper: string;
}

export interface SupplierPerformanceItem {
  id: string;
  name: string;
  leadTimeLabel: string;
  linkedProductsLabel: string;
  tone: "success" | "warning" | "default";
}

export function buildPurchaseSummary(purchases: Purchase[]) {
  const open = purchases.filter((purchase) => purchase.status === "aberta").length;
  const checked = purchases.filter((purchase) => purchase.status === "conferida").length;
  const received = purchases.filter((purchase) => purchase.status === "recebida").length;
  const total = purchases.reduce((sum, purchase) => sum + purchase.total, 0);

  const cards: PurchaseSummaryCard[] = [
    { label: "Compras abertas", value: String(open), helper: "Aguardando conferência ou recebimento" },
    { label: "Conferidas", value: String(checked), helper: "Ja passaram por validacao inicial" },
    { label: "Recebidas", value: String(received), helper: "Lotes finalizados no estoque" },
    { label: "Volume financeiro", value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Compromisso atual com fornecedores" }
  ];

  return cards;
}

export function filterPurchases(purchases: Purchase[], status: string) {
  return purchases.filter((purchase) => status === "all" || purchase.status === status);
}

export function buildPurchasePipeline(purchases: Purchase[], suppliers: Supplier[]): PurchasePipelineItem[] {
  const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name]));
  return purchases.map((purchase) => ({
    id: purchase.id,
    supplierName: supplierMap[purchase.supplierId] ?? purchase.supplierId,
    status: purchase.status,
    total: purchase.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    helper: purchase.receivedAt ? `Recebido em ${new Date(purchase.receivedAt).toLocaleDateString("pt-BR")}` : "Aguardando recebimento"
  }));
}

export function buildSupplierPerformance(suppliers: Supplier[]): SupplierPerformanceItem[] {
  return suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    leadTimeLabel: `${supplier.leadTimeDays} dias`,
    linkedProductsLabel: `${supplier.linkedProducts} produtos vinculados`,
    tone: supplier.leadTimeDays <= 8 ? "success" : supplier.leadTimeDays <= 12 ? "warning" : "default"
  }));
}
