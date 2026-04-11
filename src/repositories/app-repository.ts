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
import { normalizeLocalUsers, resolveActiveLocalUser } from "@/lib/access-control";
import { SQLiteAppRepository } from "@/services/database/sqlite-app-repository";
import { recordAuditEntry } from "@/services/audit/audit-log.service";
import { getRuntimeDiagnosticsSnapshot } from "@/services/diagnostics/runtime-diagnostics.service";
import type {
  Brand,
  Category,
  Customer,
  CustomerFormValues,
  DashboardSnapshot,
  DiagnosticsSnapshot,
  FinancialEntry,
  FinancialEntryCreateInput,
  FinancialEntryUpdateInput,
  Order,
  Product,
  ProductFormValues,
  Purchase,
  PurchaseCreateInput,
  PurchaseReceiptInput,
  ReportsSnapshot,
  Sale,
  SaleDraft,
  SettingsSnapshot,
  StockMovement,
  StockMovementDraft,
  StockSnapshot,
  StressTestLoadResult,
  StressTestPreset,
  Supplier,
  SupplierFormValues
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
  createCustomer(input: CustomerFormValues): Promise<Customer>;
  createProduct(input: ProductFormValues): Promise<Product>;
  createSupplier(input: SupplierFormValues): Promise<Supplier>;
  createPurchase(input: PurchaseCreateInput): Promise<Purchase>;
  receivePurchaseIntoStock(input: PurchaseReceiptInput): Promise<Purchase>;
  createFinancialEntry(input: FinancialEntryCreateInput): Promise<FinancialEntry>;
  updateProduct(productId: string, input: ProductFormValues): Promise<Product>;
  updateCustomer(customerId: string, input: CustomerFormValues): Promise<Customer>;
  updateCustomerStatus(customerId: string, status: Customer["status"]): Promise<Customer>;
  updateSupplier(supplierId: string, input: SupplierFormValues): Promise<Supplier>;
  updateSupplierStatus(supplierId: string, status: Supplier["status"]): Promise<Supplier>;
  updateOrderStatus(orderId: string, status: Order["status"]): Promise<Order>;
  updatePurchaseStatus(purchaseId: string, status: Purchase["status"]): Promise<Purchase>;
  updateFinancialEntry(entryId: string, input: FinancialEntryUpdateInput): Promise<FinancialEntry>;
  createStockMovement(input: StockMovementDraft): Promise<StockMovement>;
  createSale(input: SaleDraft): Promise<Sale>;
  getProductStockHistory(productId: string): Promise<StockMovement[]>;
  generateStressTestData(preset: StressTestPreset): Promise<StressTestLoadResult>;
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

const STRESS_PRESET_COUNTS: Record<StressTestPreset, { customers: number; products: number; sales: number; orders: number; purchases: number }> = {
  small: { customers: 24, products: 36, sales: 32, orders: 10, purchases: 4 },
  medium: { customers: 70, products: 90, sales: 120, orders: 28, purchases: 8 },
  large: { customers: 140, products: 180, sales: 260, orders: 54, purchases: 16 }
};

const STRESS_FIRST_NAMES = ["Ana", "Bruna", "Carlos", "Diego", "Elisa", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Karen", "Lucas", "Marina", "Nicolas", "Otavio", "Paula", "Rafaela", "Samuel", "Talita", "Vanessa"];
const STRESS_LAST_NAMES = ["Silva", "Souza", "Oliveira", "Costa", "Almeida", "Pereira", "Ferreira", "Gomes", "Barbosa", "Ramos", "Dias", "Cardoso"];
const STRESS_COLORS = ["Preto", "Branco", "Azul marinho", "Cafe", "Bege", "Rose", "Verde militar", "Cinza lunar"];
const STRESS_CALCADOS = [
  { name: "Urban Motion", subcategory: "Casual premium", material: "Knit técnico", sector: "calcados" as const, sizes: ["37", "38", "39", "40", "41", "42"] },
  { name: "Atelier Sole", subcategory: "Social", material: "Couro premium", sector: "calcados" as const, sizes: ["38", "39", "40", "41", "42"] },
  { name: "Nord Trail", subcategory: "Bota urbana", material: "Couro encerado", sector: "calcados" as const, sizes: ["37", "38", "39", "40"] }
];
const STRESS_ROUPAS = [
  { name: "Blusa Soft", subcategory: "Manga longa", material: "Viscolycra", sector: "roupas" as const, sizes: ["P", "M", "G", "GG"] },
  { name: "Jeans City", subcategory: "Reta premium", material: "Jeans com elastano", sector: "roupas" as const, sizes: ["P", "M", "G", "GG"] },
  { name: "Vestido Aura", subcategory: "Midi", material: "Malha premium", sector: "roupas" as const, sizes: ["P", "M", "G"] }
];

function pickFromList<T>(entries: T[], index: number) {
  return entries[index % entries.length];
}

function createStressCustomer(index: number): Customer {
  const firstName = pickFromList(STRESS_FIRST_NAMES, index);
  const lastName = pickFromList(STRESS_LAST_NAMES, index * 3);
  const suffix = `${String(index + 1).padStart(3, "0")}`;
  const phoneTail = String(1000 + ((index * 17) % 9000)).padStart(4, "0");

  return {
    id: `stress-c-${crypto.randomUUID()}`,
    status: "active",
    name: `${firstName} ${lastName}`,
    phone: `(11) 9${4000 + (index % 5000)}-${phoneTail}`,
    whatsapp: `(11) 9${4000 + (index % 5000)}-${phoneTail}`,
    email: `stress.cliente.${suffix}@smarttech.local`,
    lastPurchaseAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    averageTicket: 0,
    lifetimeValue: 0,
    notes: `Cliente fake ${suffix} criado para carga operacional.`
  };
}

function createStressProduct(index: number, availableCategories: Category[], availableBrands: Brand[]): Product {
  const template = index % 2 === 0 ? pickFromList(STRESS_CALCADOS, index) : pickFromList(STRESS_ROUPAS, index);
  const categoryCandidates = availableCategories.filter((category) => category.sector === template.sector);
  const category = categoryCandidates[index % Math.max(categoryCandidates.length, 1)] ?? availableCategories[0];
  const brand = availableBrands[index % Math.max(availableBrands.length, 1)];
  const color = pickFromList(STRESS_COLORS, index);
  const salePrice = Number((template.sector === "calcados" ? 179.9 + (index % 7) * 26 : 79.9 + (index % 7) * 16).toFixed(2));
  const costPrice = Number((salePrice * 0.54).toFixed(2));
  const productId = `stress-p-${crypto.randomUUID()}`;

  return {
    id: productId,
    sector: template.sector,
    name: `${template.name} ${index + 1}`,
    sku: `STRESS-${template.sector === "calcados" ? "CAL" : "ROP"}-${String(index + 1).padStart(4, "0")}`,
    internalCode: `INT-${String(index + 1).padStart(5, "0")}`,
    barcode: `7899${String(10000000 + index).padStart(8, "0")}`,
    brandId: brand?.id ?? "",
    categoryId: category?.id ?? "",
    subcategory: template.subcategory,
    gender: template.sector === "calcados" ? "Unissex" : index % 3 === 0 ? "Feminino" : "Unissex",
    material: template.material,
    color,
    costPrice,
    salePrice,
    promotionalPrice: index % 4 === 0 ? Number((salePrice * 0.92).toFixed(2)) : undefined,
    tags: ["stress", "carga", template.sector],
    status: "active",
    imageHint: `${template.name.toLowerCase()} ${color.toLowerCase()}`,
    imageDataUrl: undefined,
    sales30d: 0,
    variants: template.sizes.map((size, sizeIndex) => ({
      id: `${productId}-${size}`,
      size,
      stock: 8 + ((index + 1) * (sizeIndex + 2)) % 15,
      reserved: sizeIndex % 3 === 0 ? 1 : 0
    }))
  };
}

function buildStressSummary(result: Omit<StressTestLoadResult, "summary">) {
  return `${result.productsCreated} produtos, ${result.customersCreated} clientes e ${result.salesCreated} vendas fake carregados para teste operacional.`;
}

function buildFinanceDueAtFromDays(createdAt: string, days: number) {
  const dueAt = new Date(createdAt);
  dueAt.setDate(dueAt.getDate() + Math.max(days, 7));
  dueAt.setHours(12, 0, 0, 0);
  return dueAt.toISOString();
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

  async getSuppliers(): Promise<Supplier[]> {
    return structuredClone(mockState.suppliers).map((supplier): Supplier => ({
      ...supplier,
      status: supplier.status === "inactive" ? "inactive" : "active"
    }));
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
    const resolvedUser = resolveActiveLocalUser(mockState.settings.localUsers, mockState.settings.activeLocalUserId);
    return structuredClone({
      ...mockState.settings,
      activeLocalUserId: resolvedUser.activeLocalUserId,
      localUsers: resolvedUser.localUsers,
      currentUserName: resolvedUser.currentUserName,
      currentUserRole: resolvedUser.currentUserRole
    });
  }

  async updateSettings(input: Partial<SettingsSnapshot>) {
    const merged = {
      ...mockState.settings,
      ...input
    };
    const resolvedUser = resolveActiveLocalUser(
      input.localUsers ? normalizeLocalUsers(input.localUsers) : merged.localUsers,
      input.activeLocalUserId ?? merged.activeLocalUserId
    );
    mockState.settings = {
      ...merged,
      activeLocalUserId: resolvedUser.activeLocalUserId,
      localUsers: resolvedUser.localUsers,
      currentUserName: resolvedUser.currentUserName,
      currentUserRole: resolvedUser.currentUserRole
    };
    return structuredClone(mockState.settings);
  }

  async getDiagnosticsSnapshot() {
    return {
      ...structuredClone(diagnosticsSnapshot),
      runtime: getRuntimeDiagnosticsSnapshot(),
      logs: [
        `[INFO] Mock repository com escrita local habilitada.`,
        `[INFO] Valor do estoque pode ser recalculado em runtime: ${formatCurrency(buildStockSnapshot(mockState.products, mockState.movements).inventoryValue)}.`,
        `[INFO] Operação única com foco por setor ativa: ${getSectorLabel("geral")}.`
      ]
    };
  }

  async createCustomer(input: CustomerFormValues) {
    const customer: Customer = {
      id: `c-${crypto.randomUUID()}`,
      status: "active",
      name: input.name,
      phone: input.phone,
      whatsapp: input.whatsapp || input.phone,
      email: input.email,
      lastPurchaseAt: new Date().toISOString(),
      averageTicket: 0,
      lifetimeValue: 0,
      notes: input.notes
    };

    mockState.customers.unshift(customer);
    recordAuditEntry({
      area: "Clientes",
      action: "Cliente criado",
      details: `${customer.name} entrou na carteira local para atendimento e recompra.`
    });

    return structuredClone(customer);
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
      imageDataUrl: input.imageDataUrl,
      sales30d: 0,
      variants: input.sizes.map((entry) => ({ id: `${productId}-${entry.size}`, size: entry.size, stock: entry.stock, reserved: 0 }))
    };

    mockState.products.unshift(product);
    recordAuditEntry({
      area: "Produtos",
      action: "Cadastro criado",
      details: `${product.name} (${product.sku}) entrou no catálogo local.`
    });
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

  async createSupplier(input: SupplierFormValues) {
    const supplier: Supplier = {
      id: `s-${crypto.randomUUID()}`,
      status: "active",
      name: input.name,
      cnpj: input.cnpj,
      contact: input.contact,
      email: input.email,
      leadTimeDays: input.leadTimeDays,
      linkedProducts: 0
    };

    mockState.suppliers.unshift(supplier);
    recordAuditEntry({
      area: "Fornecedores",
      action: "Fornecedor criado",
      details: `${supplier.name} entrou na base local com prazo de ${supplier.leadTimeDays} dias.`
    });

    return structuredClone(supplier);
  }

  async createPurchase(input: PurchaseCreateInput) {
    const supplier = mockState.suppliers.find((entry) => entry.id === input.supplierId);
    if (!supplier) {
      throw new Error("Fornecedor nao encontrado para abrir a compra.");
    }

    const product = mockState.products.find((entry) => entry.id === input.productId);
    if (!product) {
      throw new Error("Produto nao encontrado para abrir a compra.");
    }

    if (input.quantity <= 0 || input.unitCost <= 0) {
      throw new Error("Quantidade e custo unitario precisam ser maiores que zero.");
    }

    const normalizedLines =
      input.sizeBreakdown?.filter((entry) => entry.quantity > 0).map((entry) => ({
        id: `pi-${crypto.randomUUID()}`,
        productId: input.productId,
        quantity: entry.quantity,
        unitCost: input.unitCost,
        size: entry.size
      })) ?? [];
    const resolvedQuantity = normalizedLines.length > 0 ? normalizedLines.reduce((sum, entry) => sum + entry.quantity, 0) : input.quantity;

    if ((input.status ?? "aberta") === "recebida" && normalizedLines.length === 0) {
      throw new Error("Para marcar a compra como recebida, distribua o lote por grade antes de salvar.");
    }

    const createdAt = new Date().toISOString();
    const purchase: Purchase = {
      id: `COMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      supplierId: input.supplierId,
      productId: input.productId,
      status: input.status ?? "aberta",
      total: Number((resolvedQuantity * input.unitCost).toFixed(2)),
      receivedAt: input.status === "recebida" ? createdAt : undefined,
      createdAt,
      items: normalizedLines.length || 1,
      quantity: resolvedQuantity,
      unitCost: input.unitCost,
      lines: normalizedLines.length > 0 ? normalizedLines : [{ id: `pi-${crypto.randomUUID()}`, productId: input.productId, quantity: input.quantity, unitCost: input.unitCost }]
    };

    mockState.purchases.unshift(purchase);
    mockState.financialEntries.unshift({
      id: `f-${crypto.randomUUID()}`,
      type: "pagar",
      description: `Compra ${purchase.id} - ${supplier.name}`,
      amount: purchase.total,
      status: "aberto",
      dueAt: buildFinanceDueAtFromDays(createdAt, supplier.leadTimeDays)
    });
    if (purchase.status === "recebida") {
      purchase.lines?.forEach((line) => {
        if (!line.size) {
          return;
        }

        const variant = product.variants.find((entry) => entry.size === line.size);
        if (!variant) {
          return;
        }

        variant.stock += line.quantity;
        mockState.movements.unshift({
          id: `m-${crypto.randomUUID()}`,
          productId: product.id,
          type: "entrada",
          quantity: line.quantity,
          createdAt,
          reason: `Recebimento da compra ${purchase.id}`,
          size: line.size
        });
      });
    }
    recordAuditEntry({
      area: "Compras",
      action: "Compra criada",
      details: `${purchase.id} aberta com ${supplier.name} para ${product.name}.`
    });

    return structuredClone(purchase);
  }

  async receivePurchaseIntoStock(input: PurchaseReceiptInput) {
    const purchaseIndex = mockState.purchases.findIndex((entry) => entry.id === input.purchaseId);
    if (purchaseIndex < 0) {
      throw new Error("Compra nao encontrada para recebimento.");
    }

    const normalizedLines = input.lines.filter((line) => line.quantity > 0);
    if (!normalizedLines.length) {
      throw new Error("Informe ao menos uma grade com quantidade para receber a compra no estoque.");
    }

    const productsSnapshot = structuredClone(mockState.products);
    const movementsToCreate: StockMovement[] = [];
    const createdAt = new Date().toISOString();

    for (const line of normalizedLines) {
      const product = productsSnapshot.find((entry) => entry.id === line.productId);
      if (!product) {
        throw new Error("Produto da compra nao foi encontrado para recebimento.");
      }

      const variant = product.variants.find((entry) => entry.size === line.size);
      if (!variant) {
        throw new Error(`A grade ${line.size} nao existe mais para ${product.name}.`);
      }

      variant.stock += line.quantity;
      movementsToCreate.push({
        id: `m-${crypto.randomUUID()}`,
        productId: line.productId,
        type: "entrada",
        quantity: line.quantity,
        createdAt,
        reason: input.reason,
        size: line.size
      });
    }

    mockState.products.splice(0, mockState.products.length, ...productsSnapshot);
    mockState.movements.unshift(...movementsToCreate.reverse());
    mockState.purchases[purchaseIndex] = {
      ...mockState.purchases[purchaseIndex],
      status: "recebida",
      receivedAt: createdAt
    };
    recordAuditEntry({
      area: "Compras",
      action: "Compra recebida no estoque",
      details: `${input.purchaseId} entrou no estoque com ${normalizedLines.length} grade(s) conferidas.`
    });

    return structuredClone(mockState.purchases[purchaseIndex]);
  }

  async createFinancialEntry(input: FinancialEntryCreateInput) {
    if (!input.description.trim()) {
      throw new Error("Informe a descricao do lancamento.");
    }

    if (input.amount <= 0) {
      throw new Error("O valor do lancamento precisa ser maior que zero.");
    }

    const normalizedDescription = input.description.trim().toLowerCase();
    if (
      normalizedDescription.startsWith("pedido ") &&
      mockState.financialEntries.some((entry) => entry.description.trim().toLowerCase().includes(normalizedDescription))
    ) {
      throw new Error("Ja existe um lancamento financeiro para esse pedido.");
    }

    const entry: FinancialEntry = {
      id: `f-${crypto.randomUUID()}`,
      type: input.type,
      description: input.description.trim(),
      amount: Number(input.amount.toFixed(2)),
      status: input.status ?? "aberto",
      dueAt: input.dueAt
    };

    mockState.financialEntries.unshift(entry);
    recordAuditEntry({
      area: "Financeiro",
      action: "Lancamento criado",
      details: `${entry.description} entrou no fluxo financeiro como ${entry.type}.`
    });

    return structuredClone(entry);
  }

  async updateProduct(productId: string, input: ProductFormValues) {
    const existingIndex = mockState.products.findIndex((product) => product.id === productId);
    if (existingIndex < 0) {
      throw new Error("Produto nao encontrado para edicao.");
    }

    const existing = mockState.products[existingIndex];
    const updated: Product = {
      ...existing,
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
      imageDataUrl: input.imageDataUrl,
      variants: input.sizes.map((entry) => {
        const currentVariant = existing.variants.find((variant) => variant.size === entry.size);
        return {
          id: currentVariant?.id ?? `${productId}-${entry.size}`,
          size: entry.size,
          stock: entry.stock,
          reserved: currentVariant?.reserved ?? 0
        };
      })
    };

    mockState.products[existingIndex] = updated;
    recordAuditEntry({
      area: "Produtos",
      action: updated.status === "inactive" ? "Produto inativado" : "Produto atualizado",
      details: `${updated.name} foi salvo com foco em ${getSectorLabel(updated.sector)}.`
    });
    return structuredClone(updated);
  }

  async updateCustomer(customerId: string, input: CustomerFormValues) {
    const existingIndex = mockState.customers.findIndex((customer) => customer.id === customerId);
    if (existingIndex < 0) {
      throw new Error("Cliente nao encontrado para edicao.");
    }

    mockState.customers[existingIndex] = {
      ...mockState.customers[existingIndex],
      ...input
    };
    recordAuditEntry({
      area: "Clientes",
      action: "Cliente atualizado",
      details: `${input.name} teve cadastro e contato revisados.`
    });

    const customer = mockState.customers[existingIndex];
    return structuredClone({
      ...customer,
      ...summarizeCustomers([customer], mockState.sales)[0]
    });
  }


  async updateCustomerStatus(customerId: string, status: Customer["status"]) {
    const existingIndex = mockState.customers.findIndex((customer) => customer.id === customerId);
    if (existingIndex < 0) {
      throw new Error("Cliente nao encontrado para atualizacao.");
    }

    mockState.customers[existingIndex] = {
      ...mockState.customers[existingIndex],
      status
    };
    recordAuditEntry({
      area: "Clientes",
      action: status === "inactive" ? "Cliente inativado" : "Cliente reativado",
      details: `${mockState.customers[existingIndex].name} ficou com status ${status}.`
    });

    const customer = mockState.customers[existingIndex];
    return structuredClone({
      ...customer,
      ...summarizeCustomers([customer], mockState.sales)[0]
    });
  }

  async updateSupplier(supplierId: string, input: SupplierFormValues): Promise<Supplier> {
    const existingIndex = mockState.suppliers.findIndex((supplier) => supplier.id === supplierId);
    if (existingIndex < 0) {
      throw new Error("Fornecedor nao encontrado para edicao.");
    }

    const updatedSupplier: Supplier = {
      ...mockState.suppliers[existingIndex],
      ...input,
      status: mockState.suppliers[existingIndex].status === "inactive" ? "inactive" : "active"
    };

    mockState.suppliers[existingIndex] = updatedSupplier;
    recordAuditEntry({
      area: "Fornecedores",
      action: "Fornecedor atualizado",
      details: `${input.name} teve contato/prazo ajustados.`
    });

    return structuredClone(updatedSupplier);
  }


  async updateSupplierStatus(supplierId: string, status: Supplier["status"]): Promise<Supplier> {
    const existingIndex = mockState.suppliers.findIndex((supplier) => supplier.id === supplierId);
    if (existingIndex < 0) {
      throw new Error("Fornecedor nao encontrado para atualizacao.");
    }

    const updatedSupplier: Supplier = {
      ...mockState.suppliers[existingIndex],
      status: status === "inactive" ? "inactive" : "active"
    };

    mockState.suppliers[existingIndex] = updatedSupplier;
    recordAuditEntry({
      area: "Fornecedores",
      action: status === "inactive" ? "Fornecedor inativado" : "Fornecedor reativado",
      details: `${updatedSupplier.name} ficou com status ${status}.`
    });

    return structuredClone(updatedSupplier);
  }

  async updateOrderStatus(orderId: string, status: Order["status"]) {
    const existingIndex = mockState.orders.findIndex((order) => order.id === orderId);
    if (existingIndex < 0) {
      throw new Error("Pedido nao encontrado para atualizacao.");
    }

    mockState.orders[existingIndex] = {
      ...mockState.orders[existingIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    recordAuditEntry({
      area: "Pedidos",
      action: "Status atualizado",
      details: `${orderId} passou para ${status}.`
    });

    return structuredClone(mockState.orders[existingIndex]);
  }

  async updatePurchaseStatus(purchaseId: string, status: Purchase["status"]) {
    const existingIndex = mockState.purchases.findIndex((purchase) => purchase.id === purchaseId);
    if (existingIndex < 0) {
      throw new Error("Compra nao encontrada para atualizacao.");
    }

    mockState.purchases[existingIndex] = {
      ...mockState.purchases[existingIndex],
      status,
      receivedAt: status === "recebida" ? new Date().toISOString() : status === "conferida" ? mockState.purchases[existingIndex].receivedAt : undefined
    };
    recordAuditEntry({
      area: "Compras",
      action: "Status de compra atualizado",
      details: `${purchaseId} passou para ${status}.`
    });

    return structuredClone(mockState.purchases[existingIndex]);
  }

  async updateFinancialEntry(entryId: string, input: FinancialEntryUpdateInput) {
    const existingIndex = mockState.financialEntries.findIndex((entry) => entry.id === entryId);
    if (existingIndex < 0) {
      throw new Error("Lancamento financeiro nao encontrado.");
    }

    mockState.financialEntries[existingIndex] = {
      ...mockState.financialEntries[existingIndex],
      ...input
    };
    recordAuditEntry({
      area: "Financeiro",
      action: "Lançamento atualizado",
      details: `${mockState.financialEntries[existingIndex].description} foi ajustado.`
    });

    return structuredClone(mockState.financialEntries[existingIndex]);
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
    recordAuditEntry({
      area: "Estoque",
      action: "Movimentação registrada",
      details: `${input.type} de ${input.quantity} em ${product.name} (${input.size}). Motivo: ${input.reason}.`
    });
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
    recordAuditEntry({
      area: "PDV",
      action: "Venda finalizada",
      details: `${sale.id} fechada em ${formatCurrency(sale.total)} com ${sale.paymentMethods.join(" + ")}.`
    });
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

  async generateStressTestData(preset: StressTestPreset): Promise<StressTestLoadResult> {
    const counts = STRESS_PRESET_COUNTS[preset];
    const createdCustomers = Array.from({ length: counts.customers }, (_, index) => createStressCustomer(index));
    const createdProducts = Array.from({ length: counts.products }, (_, index) =>
      createStressProduct(index, mockState.categories, mockState.brands)
    );

    mockState.customers.unshift(...createdCustomers);
    mockState.products.unshift(...createdProducts);

    let stockMovementsCreated = 0;
    createdProducts.forEach((product) => {
      const initialUnits = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      stockMovementsCreated += 1;
      mockState.movements.unshift({
        id: `m-${crypto.randomUUID()}`,
        productId: product.id,
        type: "entrada",
        quantity: initialUnits,
        createdAt: new Date().toISOString(),
        reason: "Carga fake operacional",
        size: "grade"
      });
    });

    const createdSales: Sale[] = [];
    const createdOrders: Order[] = [];
    const createdPurchases: Purchase[] = [];
    const createdFinancialEntries: FinancialEntry[] = [];

    for (let index = 0; index < counts.sales; index += 1) {
      const product = createdProducts[index % createdProducts.length];
      const variant = product.variants[index % product.variants.length];
      if (variant.stock <= 1) {
        continue;
      }

      const quantity = 1 + (index % 2);
      variant.stock -= quantity;
      stockMovementsCreated += 1;
      const saleTotal = Number((quantity * (product.promotionalPrice ?? product.salePrice)).toFixed(2));
      const createdAt = new Date(Date.now() - index * 3_600_000).toISOString();
      const sale: Sale = {
        id: `V-STRESS-${crypto.randomUUID()}`,
        customerId: createdCustomers[index % createdCustomers.length]?.id,
        subtotal: saleTotal,
        discount: 0,
        total: saleTotal,
        paymentMethods: [pickFromList(["Pix", "Cartao", "Dinheiro", "Crediario"] as const, index)],
        createdAt,
        items: [{ productId: product.id, size: variant.size, quantity, unitPrice: product.promotionalPrice ?? product.salePrice }]
      };

      createdSales.push(sale);
      mockState.movements.unshift({
        id: `m-${crypto.randomUUID()}`,
        productId: product.id,
        type: "saida",
        quantity: -quantity,
        createdAt,
        reason: `Carga fake ${sale.id}`,
        size: variant.size
      });
      createdFinancialEntries.push({
        id: `f-${crypto.randomUUID()}`,
        type: "receber",
        description: `Venda fake ${sale.id}`,
        amount: saleTotal,
        status: sale.paymentMethods[0] === "Crediario" ? "aberto" : "pago",
        dueAt: createdAt
      });
    }

    for (let index = 0; index < counts.orders; index += 1) {
      const customer = createdCustomers[index % createdCustomers.length];
      createdOrders.push({
        id: `O-STRESS-${crypto.randomUUID()}`,
        customerId: customer.id,
        status: pickFromList(["novo", "em separacao", "pronto"] as const, index),
        value: Number((119.9 + (index % 5) * 38).toFixed(2)),
        createdAt: new Date(Date.now() - index * 7_200_000).toISOString(),
        updatedAt: new Date(Date.now() - index * 3_600_000).toISOString(),
        items: 1 + (index % 3)
      });
    }

    for (let index = 0; index < counts.purchases; index += 1) {
      const supplier = mockState.suppliers[index % mockState.suppliers.length];
      const product = createdProducts[index % createdProducts.length];
      createdPurchases.push({
        id: `P-STRESS-${crypto.randomUUID()}`,
        supplierId: supplier.id,
        productId: product.id,
          status: pickFromList(["aberta", "conferida", "recebida"] as const, index),
          total: Number((620 + (index % 4) * 180).toFixed(2)),
          receivedAt: index % 3 === 2 ? new Date(Date.now() - index * 86_400_000).toISOString() : undefined,
          createdAt: new Date(Date.now() - index * 172_800_000).toISOString(),
          items: 2,
          quantity: 3 + (index % 4),
          unitCost: Number(product.costPrice.toFixed(2)),
          lines: product.variants.slice(0, 2).map((variant, lineIndex) => ({
            id: `pi-${index}-${lineIndex}`,
            productId: product.id,
            size: variant.size,
            quantity: 1 + ((index + lineIndex) % 3),
            unitCost: Number(product.costPrice.toFixed(2))
          }))
        });
      createdFinancialEntries.push({
        id: `f-${crypto.randomUUID()}`,
        type: "pagar",
        description: `Compra ${createdPurchases[createdPurchases.length - 1].id} - ${supplier.name}`,
        amount: createdPurchases[createdPurchases.length - 1].total,
        status: "aberto",
        dueAt: buildFinanceDueAtFromDays(createdPurchases[createdPurchases.length - 1].createdAt, supplier.leadTimeDays)
      });
    }

    mockState.sales.unshift(...createdSales);
    mockState.orders.unshift(...createdOrders);
    mockState.purchases.unshift(...createdPurchases);
    mockState.financialEntries.unshift(...createdFinancialEntries);

    const baseResult = {
      preset,
      customersCreated: createdCustomers.length,
      productsCreated: createdProducts.length,
      salesCreated: createdSales.length,
      ordersCreated: createdOrders.length,
      purchasesCreated: createdPurchases.length,
      financialEntriesCreated: createdFinancialEntries.length,
      stockMovementsCreated
    };

    recordAuditEntry({
      area: "Diagnostico",
      action: "Carga fake aplicada",
      details: buildStressSummary(baseResult)
    });

    return {
      ...baseResult,
      summary: buildStressSummary(baseResult)
    };
  }

  async getProductStockHistory(productId: string) {
    return structuredClone(mockState.movements.filter((movement) => movement.productId === productId));
  }
}

const sqliteRepository = new SQLiteAppRepository();
const mockRepository = new MockAppRepository();

export const appRepository: AppRepository = isTauriRuntime() ? sqliteRepository : mockRepository;

