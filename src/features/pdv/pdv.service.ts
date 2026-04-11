import { getSectorLabel } from "@/features/products/product.service";
import type { CartItem, Customer, OperationFocus, Product, Sale } from "@/types/domain";

export interface PdvSummaryCard {
  label: string;
  value: string;
  helper: string;
}

export interface PdvHistoryItem {
  id: string;
  customerName: string;
  totalLabel: string;
  createdAtLabel: string;
  paymentLabel: string;
}

export function filterPdvProducts(products: Product[], query: string, focus: OperationFocus = "geral") {
  const normalized = query.trim().toLowerCase();
  const filteredByFocus = focus === "geral" ? products : products.filter((product) => product.sector === focus);
  if (!normalized) {
    return filteredByFocus;
  }

  return filteredByFocus.filter((product) =>
    [product.name, product.sku, product.barcode, product.internalCode, getSectorLabel(product.sector)].join(" ").toLowerCase().includes(normalized)
  );
}

export function buildPdvSummary(subtotal: number, total: number, selectedCustomer: Customer | undefined, itemsCount: number): PdvSummaryCard[] {
  return [
    { label: "Cliente", value: selectedCustomer?.name ?? "Consumidor final", helper: selectedCustomer ? "Cadastro vinculado a venda" : "Venda rápida sem identificação" },
    { label: "Itens", value: String(itemsCount), helper: "Quantidade total no carrinho" },
    { label: "Subtotal", value: subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Antes de descontos" },
    { label: "Total", value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), helper: "Valor final para fechamento" }
  ];
}

export function buildRecentSaleHistory(sales: Sale[], customers: Customer[]): PdvHistoryItem[] {
  const customerMap = Object.fromEntries(customers.map((customer) => [customer.id, customer.name]));
  return sales.slice(0, 5).map((sale) => ({
    id: sale.id,
    customerName: sale.customerId ? customerMap[sale.customerId] ?? sale.customerId : "Consumidor final",
    totalLabel: sale.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    createdAtLabel: new Date(sale.createdAt).toLocaleString("pt-BR"),
    paymentLabel: sale.paymentMethods.join(" + ")
  }));
}

export function buildThermalPreview(cart: CartItem[], total: number) {
  return [
    "SMART TECH PDV",
    "Cupom não fiscal",
    ...cart.map((item) => `${item.name} ${item.size} x${item.quantity}`),
    `TOTAL ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
  ];
}
