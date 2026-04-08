import {
  brands,
  categories,
  customers,
  diagnosticsSnapshot,
  financialEntries,
  orders,
  products,
  purchases,
  sales,
  settingsSnapshot,
  stockMovements,
  suppliers
} from "@/services/data/demo-data";
import { buildProductCatalogSummary, getSectorLabel } from "@/features/products/product.service";
import { buildStockSnapshot, getUnits } from "@/features/stock/stock.service";
import { isTauriRuntime } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import { SQLiteAppRepository } from "@/services/database/sqlite-app-repository";
import type {
  Brand,
  Category,
  Customer,
  DashboardSnapshot,
  DiagnosticsSnapshot,
  FinancialEntry,
  Order,
  Product,
  ProductFormValues,
  Purchase,
  ReportsSnapshot,
  Sale,
  SaleDraft,
  SettingsSnapshot,
  StockMovement,
  StockMovementDraft,
  StockSnapshot,
  Supplier
} from "@/types/domain";

export interface AppRepository {
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
  getProducts(): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
  getBrands(): Promise<Brand[]>;
  getCustomers(): Promise<Customer[]>;
  getOrders(): Promise<Order[]>;
  getSales(): Promise<Sale[]>;
  getSuppliers(): Promise<Supplier[]>;
  getPurchases(): Promise<Purchase[]>;
  getFinancialEntries(): Promise<FinancialEntry[]>;
  getStockSnapshot(): Promise<StockSnapshot>;
  getReportsSnapshot(): Promise<ReportsSnapshot>;
  getSettingsSnapshot(): Promise<SettingsSnapshot>;
  updateSettings(input: Partial<SettingsSnapshot>): Promise<SettingsSnapshot>;
  getDiagnosticsSnapshot(): Promise<DiagnosticsSnapshot>;
  createProduct(input: ProductFormValues): Promise<Product>;
  createStockMovement(input: StockMovementDraft): Promise<StockMovement>;
  createSale(input: SaleDraft): Promise<Sale>;
  getProductStockHistory(productId: string): Promise<StockMovement[]>;
}

function summarizeCustomers(baseCustomers: Customer[], currentSales: Sale[]) {
  const salesByCustomer = new Map<string, Sale[]>();

  currentSales.forEach((sale) => {
    if (!sale.customerId) {
      return;
    }
    const current = salesByCustomer.get(sale.customerId) ?? [];
    current.push(sale);
    salesByCustomer.set(sale.customerId, current);
  });

  return baseCustomers.map((customer) => {
    const customerSales = salesByCustomer.get(customer.id) ?? [];
    const lifetimeValue = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageTicket = customerSales.length ? lifetimeValue / customerSales.length : customer.averageTicket;
    const lastPurchaseAt = customerSales[0]?.createdAt ?? customer.lastPurchaseAt;
    return {
      ...customer,
      lifetimeValue,
      averageTicket,
      lastPurchaseAt
    };
  });
}

function buildReports(productsSource: Product[], customersSource: Customer[], entries: FinancialEntry[], currentSales: Sale[]): ReportsSnapshot {
  const paymentTotals = new Map<string, number>();
  currentSales.forEach((sale) => {
    sale.paymentMethods.forEach((method) => {
      paymentTotals.set(method, (paymentTotals.get(method) ?? 0) + sale.total / sale.paymentMethods.length);
    });
  });
  const totalByChannel = [...paymentTotals.values()].reduce((sum, value) => sum + value, 0);

  const salesByChannel = [...paymentTotals.entries()].map(([label, value]) => ({
    label,
    value: totalByChannel > 0 ? Number(((value / totalByChannel) * 100).toFixed(1)) : 0
  }));

  const financialBalance = [
    {
      label: "Receber aberto",
      value: entries.filter((entry) => entry.type === "receber" && entry.status !== "pago").reduce((sum, entry) => sum + entry.amount, 0)
    },
    {
      label: "Receitas pagas",
      value: entries.filter((entry) => entry.type === "receber" && entry.status === "pago").reduce((sum, entry) => sum + entry.amount, 0)
    },
    {
      label: "Pagamentos pendentes",
      value: entries.filter((entry) => entry.type === "pagar" && entry.status !== "pago").reduce((sum, entry) => sum + entry.amount, 0)
    }
  ];

  return {
    salesByChannel,
    dormantProducts: [...productsSource].sort((a, b) => a.sales30d - b.sales30d).slice(0, 6),
    bestCustomers: [...customersSource].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 6),
    financialBalance
  };
}

function buildDashboardFromProducts(currentProducts: Product[]): DashboardSnapshot {
  const summary = buildProductCatalogSummary(currentProducts);
  const lowStockProducts = currentProducts.filter((product) => getUnits(product) <= 10);
  return {
    metrics: [
      { id: "m1", label: "Produtos ativos", value: String(summary.activeProducts), helper: "Catalogo operacional atualizado", trend: "up" },
      { id: "m2", label: "Baixo estoque", value: String(summary.lowStockProducts), helper: "Leitura de risco operacional", trend: "down" },
      { id: "m3", label: "Margem media", value: `${summary.averageMargin.toFixed(1)}%`, helper: "Derivada do catalogo atual", trend: "up" },
      { id: "m4", label: "Unidades", value: String(summary.totalUnits), helper: "Saldo total da base local", trend: "neutral" }
    ],
    salesSeries: [
      { label: "Seg", value: 8420 },
      { label: "Ter", value: 9580 },
      { label: "Qua", value: 10120 },
      { label: "Qui", value: 11240 },
      { label: "Sex", value: 10580 },
      { label: "Sab", value: 13210 },
      { label: "Dom", value: 14890 }
    ],
    categorySeries: categories.map((category) => ({ label: category.name, value: category.share })),
    lowStockProducts,
    topProducts: [...currentProducts].sort((a, b) => b.sales30d - a.sales30d).slice(0, 4),
    recentOrders: structuredClone(orders),
    recentCustomers: structuredClone(customers).slice(0, 4),
    quickActions: [
      { id: "qa1", label: "Nova venda", description: "Abre PDV com foco no teclado", path: "/pdv" },
      { id: "qa2", label: "Novo produto", description: "Cadastro rapido com grade", path: "/produtos" },
      { id: "qa3", label: "Entrada de estoque", description: "Lancamento por lote e fornecedor", path: "/estoque" },
      { id: "qa4", label: "Ver relatorios", description: "Fechamento financeiro e produtos", path: "/relatorios" }
    ],
    focusCards: [
      {
        id: "f1",
        title: "Reposicao imediata",
        description: `${lowStockProducts.length} produtos precisam compra antes do proximo pico de vendas.`,
        tone: lowStockProducts.length > 0 ? "warning" : "success",
        actionLabel: "Ir ao estoque",
        actionPath: "/estoque"
      },
      {
        id: "f2",
        title: "Operacao unificada",
        description: "Roupas e calcados no mesmo sistema, mas com foco por setor para o operador nao se perder.",
        tone: "success",
        actionLabel: "Abrir produtos",
        actionPath: "/produtos"
      },
      {
        id: "f3",
        title: "Fluxo rapido",
        description: "PDV segue preparado para nova venda com foco no teclado.",
        tone: "default",
        actionLabel: "Ir ao PDV",
        actionPath: "/pdv"
      }
    ]
  };
}

const mockState = {
  products: structuredClone(products),
  brands: structuredClone(brands),
  categories: structuredClone(categories),
  customers: structuredClone(customers),
  suppliers: structuredClone(suppliers),
  orders: structuredClone(orders),
  purchases: structuredClone(purchases),
  sales: structuredClone(sales),
  financialEntries: structuredClone(financialEntries),
  movements: structuredClone(stockMovements),
  settings: structuredClone(settingsSnapshot)
};

class MockAppRepository implements AppRepository {
  async getDashboardSnapshot() {
    return structuredClone(buildDashboardFromProducts(mockState.products));
  }

  async getProducts() {
    return structuredClone(mockState.products);
  }

  async getCategories() {
    return structuredClone(mockState.categories);
  }

  async getBrands() {
    return structuredClone(mockState.brands);
  }

  async getCustomers() {
    return structuredClone(summarizeCustomers(mockState.customers, mockState.sales));
  }

  async getOrders() {
    return structuredClone(mockState.orders);
  }

  async getSales() {
    return structuredClone(mockState.sales).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getSuppliers() {
    return structuredClone(mockState.suppliers);
  }

  async getPurchases() {
    return structuredClone(mockState.purchases);
  }

  async getFinancialEntries() {
    return structuredClone(mockState.financialEntries);
  }

  async getStockSnapshot() {
    return structuredClone(buildStockSnapshot(mockState.products, mockState.movements));
  }

  async getReportsSnapshot() {
    return structuredClone(buildReports(mockState.products, await this.getCustomers(), mockState.financialEntries, mockState.sales));
  }

  async getSettingsSnapshot() {
    return structuredClone(mockState.settings);
  }

  async updateSettings(input: Partial<SettingsSnapshot>) {
    mockState.settings = {
      ...mockState.settings,
      ...input
    };
    return structuredClone(mockState.settings);
  }

  async getDiagnosticsSnapshot() {
    return {
      ...structuredClone(diagnosticsSnapshot),
      logs: [
        `[INFO] Mock repository com escrita local habilitada.`,
        `[INFO] Valor do estoque pode ser recalculado em runtime: ${formatCurrency(buildStockSnapshot(mockState.products, mockState.movements).inventoryValue)}.`,
        `[INFO] Operacao unica com foco por setor ativa: ${getSectorLabel("geral")}.`
      ]
    };
  }

  async createProduct(input: ProductFormValues) {
    const productId = `p-${crypto.randomUUID()}`;
    const product: Product = {
      id: productId,
      sector: input.sector,
      name: input.name,
      sku: input.sku,
      internalCode: input.internalCode,
      barcode: input.barcode,
      brandId: input.brandId,
      categoryId: input.categoryId,
      subcategory: input.subcategory,
      gender: input.gender,
      material: input.material,
      color: input.color,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      promotionalPrice: input.promotionalPrice || undefined,
      tags: input.tags,
      status: input.status,
      imageHint: input.imageHint,
      sales30d: 0,
      variants: input.sizes.map((entry) => ({ id: `${productId}-${entry.size}`, size: entry.size, stock: entry.stock, reserved: 0 }))
    };

    mockState.products.unshift(product);
    const initialUnits = input.sizes.reduce((sum, entry) => sum + entry.stock, 0);
    if (initialUnits > 0) {
      mockState.movements.unshift({
        id: `m-${crypto.randomUUID()}`,
        productId,
        type: "entrada",
        quantity: initialUnits,
        createdAt: new Date().toISOString(),
        reason: "Cadastro inicial",
        size: "grade"
      });
    }

    return structuredClone(product);
  }

  async createStockMovement(input: StockMovementDraft) {
    const product = mockState.products.find((item) => item.id === input.productId);
    if (!product) {
      throw new Error("Produto nao encontrado para movimentacao.");
    }

    const variant = product.variants.find((item) => item.size === input.size);
    if (!variant) {
      throw new Error("Grade nao encontrada para movimentacao.");
    }

    const nextStock = variant.stock + input.quantity;
    if (nextStock < 0) {
      throw new Error("Estoque nao pode ficar negativo.");
    }

    variant.stock = nextStock;
    const movement: StockMovement = {
      id: `m-${crypto.randomUUID()}`,
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      createdAt: new Date().toISOString(),
      reason: input.reason,
      size: input.size
    };
    mockState.movements.unshift(movement);
    return structuredClone(movement);
  }

  async createSale(input: SaleDraft) {
    if (!input.items.length) {
      throw new Error("Adicione ao menos um item para finalizar a venda.");
    }

    if (!input.paymentMethods.length) {
      throw new Error("Selecione ao menos uma forma de pagamento.");
    }

    for (const item of input.items) {
      const product = mockState.products.find((entry) => entry.id === item.productId);
      if (!product) {
        throw new Error(`Produto ${item.productId} nao encontrado.`);
      }

      const variant = product.variants.find((entry) => entry.size === item.size);
      if (!variant || variant.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name} ${item.size}.`);
      }
    }

    const sale: Sale = {
      id: `V-${crypto.randomUUID()}`,
      customerId: input.customerId,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      paymentMethods: input.paymentMethods,
      createdAt: new Date().toISOString(),
      items: input.items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity, unitPrice: item.unitPrice }))
    };

    input.items.forEach((item) => {
      const product = mockState.products.find((entry) => entry.id === item.productId)!;
      const variant = product.variants.find((entry) => entry.size === item.size)!;
      variant.stock -= item.quantity;
      mockState.movements.unshift({
        id: `m-${crypto.randomUUID()}`,
        productId: item.productId,
        type: "saida",
        quantity: -item.quantity,
        createdAt: sale.createdAt,
        reason: `Venda ${sale.id}`,
        size: item.size
      });
    });

    mockState.sales.unshift(sale);
    mockState.financialEntries.unshift({
      id: `f-${crypto.randomUUID()}`,
      type: "receber",
      description: `Venda ${sale.id}`,
      amount: sale.total,
      status: input.paymentMethods.includes("Dinheiro") || input.paymentMethods.includes("Pix") ? "pago" : "aberto",
      dueAt: sale.createdAt
    });

    return structuredClone(sale);
  }

  async getProductStockHistory(productId: string) {
    return structuredClone(mockState.movements.filter((movement) => movement.productId === productId));
  }
}

const sqliteRepository = new SQLiteAppRepository();
const mockRepository = new MockAppRepository();

export const appRepository: AppRepository = isTauriRuntime() ? sqliteRepository : mockRepository;
