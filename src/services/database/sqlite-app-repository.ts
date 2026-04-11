import { buildProductCatalogSummary } from "@/features/products/product.service";
import { buildStockAlerts, buildStockSnapshot } from "@/features/stock/stock.service";
import { getDefaultLocalUsers, getDefaultUserProfile, normalizeLocalUsers, normalizeUserRole, resolveActiveLocalUser } from "@/lib/access-control";
import type { AppRepository } from "@/repositories/app-repository";
import { getSqliteDatabase } from "@/services/database/sqlite-db";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { formatCurrency } from "@/lib/utils";
import { getRecentAuditEntries, recordAuditEntry } from "@/services/audit/audit-log.service";
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
  ProductVariant,
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

async function selectRows<T = Record<string, unknown>>(db: any, sql: string, params?: unknown[]): Promise<T[]> {
  return (await db.select(sql, params)) as T[];
}

function isDatabaseLockedError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase();
  return message.includes("database is locked") || message.includes("database table is locked") || message.includes("code: 5");
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runWithSqliteLockRetry<T>(action: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isDatabaseLockedError(error) || attempt === attempts) {
        break;
      }

      await wait(140 * attempt);
    }
  }

  throw lastError;
}

let sqliteWriteQueue = Promise.resolve();

async function runInSerializedSqliteWrite<T>(action: () => Promise<T>): Promise<T> {
  const run = sqliteWriteQueue.then(action, action);
  sqliteWriteQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function loadProducts(db: any): Promise<Product[]> {
  const productRows = await selectRows<any>(db, "SELECT * FROM products ORDER BY name");
  const variantRows = await selectRows<any>(db, "SELECT * FROM product_variants ORDER BY product_id, size");
  const variantsByProduct = new Map<string, ProductVariant[]>();

  variantRows.forEach((variant) => {
    const current = variantsByProduct.get(String(variant.product_id)) ?? [];
    current.push({
      id: String(variant.id),
      size: String(variant.size),
      stock: Number(variant.stock),
      reserved: Number(variant.reserved)
    });
    variantsByProduct.set(String(variant.product_id), current);
  });

  return productRows.map((row) => ({
    id: String(row.id),
    sector: (row.sector === "roupas" ? "roupas" : "calcados") as Product["sector"],
    name: String(row.name),
    sku: String(row.sku),
    internalCode: String(row.internal_code),
    barcode: String(row.barcode ?? ""),
    brandId: String(row.brand_id ?? ""),
    categoryId: String(row.category_id ?? ""),
    subcategory: String(row.subcategory ?? ""),
    gender: String(row.gender ?? "Unissex"),
    material: String(row.material ?? ""),
    color: String(row.color ?? ""),
    costPrice: Number(row.cost_price),
    salePrice: Number(row.sale_price),
    promotionalPrice: row.promotional_price != null ? Number(row.promotional_price) : undefined,
    tags: row.tags ? String(row.tags).split(",").filter(Boolean) : [],
    status: row.status === "inactive" ? "inactive" : "active",
    imageHint: String(row.image_hint ?? "produto premium"),
    imageDataUrl: row.image_data_url ? String(row.image_data_url) : undefined,
    variants: variantsByProduct.get(String(row.id)) ?? [],
    sales30d: Number(row.sales_30d ?? 0)
  }));
}

async function loadCustomers(db: any): Promise<Customer[]> {
  const rows = await selectRows<any>(db, "SELECT * FROM customers ORDER BY name");
  return rows.map((row) => ({
    id: String(row.id),
    status: row.status === "inactive" ? "inactive" : "active",
    name: String(row.name),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? row.phone ?? ""),
    email: String(row.email ?? ""),
    lastPurchaseAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    averageTicket: 0,
    lifetimeValue: 0,
    notes: String(row.notes ?? "")
  }));
}

async function loadSales(db: any): Promise<Sale[]> {
  const saleRows = await selectRows<any>(db, "SELECT * FROM sales ORDER BY created_at DESC");
  const itemRows = await selectRows<any>(db, "SELECT * FROM sale_items ORDER BY sale_id");
  const itemsBySale = new Map<string, Sale["items"]>();

  itemRows.forEach((row) => {
    const saleId = String(row.sale_id);
    const current = itemsBySale.get(saleId) ?? [];
    current.push({
      productId: String(row.product_id),
      size: String(row.size ?? ""),
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price)
    });
    itemsBySale.set(saleId, current);
  });

  return saleRows.map((row) => ({
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    paymentMethods: String(row.payment_methods)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) as Sale["paymentMethods"],
    createdAt: String(row.created_at),
    items: itemsBySale.get(String(row.id)) ?? []
  }));
}

async function loadStockMovements(db: any): Promise<StockMovement[]> {
  const rows = await selectRows<any>(db, "SELECT * FROM stock_movements ORDER BY created_at DESC");
  return rows.map((row) => ({
    id: String(row.id),
    productId: String(row.product_id),
    type: row.type,
    quantity: Number(row.quantity),
    createdAt: String(row.created_at),
    reason: String(row.reason ?? ""),
    size: row.size ? String(row.size) : undefined
  }));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return fallback;
}

function buildFinanceDueAtFromDays(createdAt: string, days: number) {
  const dueAt = new Date(createdAt);
  dueAt.setDate(dueAt.getDate() + Math.max(days, 7));
  dueAt.setHours(12, 0, 0, 0);
  return dueAt.toISOString();
}

function mergeCustomerMetrics(customers: Customer[], sales: Sale[]): Customer[] {
  const salesByCustomer = new Map<string, Sale[]>();

  sales.forEach((sale) => {
    if (!sale.customerId) {
      return;
    }
    const current = salesByCustomer.get(sale.customerId) ?? [];
    current.push(sale);
    salesByCustomer.set(sale.customerId, current);
  });

  return customers.map((customer) => {
    const customerSales = salesByCustomer.get(customer.id) ?? [];
    const lifetimeValue = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageTicket = customerSales.length ? lifetimeValue / customerSales.length : 0;
    return {
      ...customer,
      lifetimeValue,
      averageTicket,
      lastPurchaseAt: customerSales[0]?.createdAt ?? customer.lastPurchaseAt
    };
  });
}

function buildReportsSnapshotFromData(products: Product[], customers: Customer[], entries: FinancialEntry[], sales: Sale[]): ReportsSnapshot {
  const paymentTotals = new Map<string, number>();
  sales.forEach((sale) => {
    sale.paymentMethods.forEach((method) => {
      paymentTotals.set(method, (paymentTotals.get(method) ?? 0) + sale.total / sale.paymentMethods.length);
    });
  });

  const totalByChannel = [...paymentTotals.values()].reduce((sum, value) => sum + value, 0);
  const salesByChannel = [...paymentTotals.entries()].map(([label, value]) => ({
    label,
    value: totalByChannel > 0 ? Number(((value / totalByChannel) * 100).toFixed(1)) : 0
  }));

  return {
    salesByChannel,
    dormantProducts: [...products].sort((a, b) => a.sales30d - b.sales30d).slice(0, 6),
    bestCustomers: [...customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 6),
    financialBalance: [
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
    ]
  };
}

async function loadSettingsMap(db: any): Promise<Map<string, string>> {
  const rows = await selectRows<any>(db, "SELECT key, value FROM settings");
  return new Map(rows.map((row) => [String(row.key), String(row.value ?? "")]));
}

const STRESS_PRESET_COUNTS: Record<StressTestPreset, { customers: number; products: number; sales: number; orders: number; purchases: number }> = {
  small: { customers: 24, products: 36, sales: 32, orders: 10, purchases: 4 },
  medium: { customers: 70, products: 90, sales: 120, orders: 28, purchases: 8 },
  large: { customers: 140, products: 180, sales: 260, orders: 54, purchases: 16 }
};

const STRESS_FIRST_NAMES = ["Ana", "Bruna", "Carlos", "Diego", "Elisa", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Karen", "Lucas", "Marina", "Nicolas", "Otavio", "Paula", "Rafaela", "Samuel", "Talita", "Vanessa"];
const STRESS_LAST_NAMES = ["Silva", "Souza", "Oliveira", "Costa", "Almeida", "Pereira", "Ferreira", "Gomes", "Barbosa", "Ramos", "Dias", "Cardoso"];
const STRESS_COLORS = ["Preto", "Branco", "Azul marinho", "Cafe", "Bege", "Rose", "Verde militar", "Cinza lunar"];

export class SQLiteAppRepository implements AppRepository {
  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const products = await loadProducts(db);
    const lowStockProducts = products.filter((product) => product.variants.reduce((sum, variant) => sum + variant.stock, 0) <= 10);
    const summary = buildProductCatalogSummary(products);

    return {
      metrics: [
        { id: "m1", label: "Produtos ativos", value: String(summary.activeProducts), helper: "Catalogo carregado do SQLite", trend: "up" },
        { id: "m2", label: "Baixo estoque", value: String(summary.lowStockProducts), helper: "Leitura de risco operacional", trend: "down" },
        { id: "m3", label: "Margem media", value: `${summary.averageMargin.toFixed(1)}%`, helper: "Derivada do catalogo local", trend: "up" },
        { id: "m4", label: "Unidades", value: String(summary.totalUnits), helper: "Saldo total da base local", trend: "neutral" }
      ],
      salesSeries: [],
      categorySeries: [],
      lowStockProducts,
      topProducts: products.slice(0, 4),
      recentOrders: [],
      recentCustomers: [],
      quickActions: [
        { id: "qa1", label: "Nova venda", description: "Abre PDV com foco no teclado", path: "/pdv" },
        { id: "qa2", label: "Novo produto", description: "Cadastro rapido com grade", path: "/produtos" }
      ],
      focusCards: [
        { id: "fc1", title: "Base local conectada", description: "Dashboard lendo produtos do SQLite no runtime desktop.", tone: "success", actionLabel: "Abrir estoque", actionPath: "/estoque" }
      ]
    };
  }

  async getProducts(): Promise<Product[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    return loadProducts(db);
  }

  async getCategories(): Promise<Category[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT id, name, sector FROM categories ORDER BY name");
    return rows.map((row) => ({
      id: String(row.id),
      status: row.status === "inactive" ? "inactive" : "active",
      name: String(row.name),
      share: 0,
      sector: row.sector === "roupas" ? "roupas" : "calcados"
    }));
  }

  async getBrands(): Promise<Brand[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT id, name, lead_time_days FROM brands ORDER BY name");
    return rows.map((row) => ({ id: String(row.id), name: String(row.name), leadTimeDays: Number(row.lead_time_days) }));
  }

  async getCustomers(): Promise<Customer[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const [customers, sales] = await Promise.all([loadCustomers(db), loadSales(db)]);
    return mergeCustomerMetrics(customers, sales);
  }

  async getOrders(): Promise<Order[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT * FROM orders ORDER BY created_at DESC");
    return rows.map((row) => ({
      id: String(row.id),
      customerId: String(row.customer_id),
      status: row.status,
      value: Number(row.value),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      items: 0
    }));
  }

  async getSales(): Promise<Sale[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    return loadSales(db);
  }

  async getSuppliers(): Promise<Supplier[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT * FROM suppliers ORDER BY name");
    return rows.map((row): Supplier => ({
      id: String(row.id),
      status: row.status === "inactive" ? "inactive" : "active",
      name: String(row.name),
      cnpj: String(row.cnpj ?? ""),
      contact: String(row.contact ?? ""),
      email: String(row.email ?? ""),
      leadTimeDays: Number(row.lead_time_days ?? 0),
      linkedProducts: 0
    }));
  }

  async getPurchases(): Promise<Purchase[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT * FROM purchases ORDER BY created_at DESC");
    const itemRows = await selectRows<any>(
      db,
      "SELECT id, purchase_id, product_id, quantity, unit_cost, size FROM purchase_items ORDER BY purchase_id, size"
    );
    const linesByPurchase = new Map<string, Purchase["lines"]>();

    itemRows.forEach((row) => {
      const purchaseId = String(row.purchase_id);
      const current = linesByPurchase.get(purchaseId) ?? [];
      current.push({
        id: String(row.id),
        productId: String(row.product_id),
        quantity: Number(row.quantity),
        unitCost: Number(row.unit_cost),
        size: row.size ? String(row.size) : undefined
      });
      linesByPurchase.set(purchaseId, current);
    });

    return rows.map((row) => {
      const lines = linesByPurchase.get(String(row.id)) ?? [];
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

      return {
        id: String(row.id),
        supplierId: String(row.supplier_id),
        productId: lines[0]?.productId,
        status: row.status,
        total: Number(row.total),
        receivedAt: row.received_at ? String(row.received_at) : undefined,
        createdAt: String(row.created_at),
        items: lines.length,
        quantity: totalQuantity || undefined,
        unitCost: lines[0]?.unitCost,
        lines
      };
    });
  }

  async getFinancialEntries(): Promise<FinancialEntry[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT * FROM financial_entries ORDER BY due_at DESC");
    return rows.map((row) => ({
      id: String(row.id),
      type: row.type,
      description: String(row.description),
      amount: Number(row.amount),
      status: row.status,
      dueAt: String(row.due_at)
    }));
  }

  async getStockSnapshot(): Promise<StockSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const products = await loadProducts(db);
    const movements = await loadStockMovements(db);
    return buildStockSnapshot(products, movements);
  }

  async getReportsSnapshot(): Promise<ReportsSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const [products, sales, entries] = await Promise.all([loadProducts(db), loadSales(db), this.getFinancialEntries()]);
    const customers = mergeCustomerMetrics(await loadCustomers(db), sales);
    return buildReportsSnapshotFromData(products, customers, entries, sales);
  }

  async getSettingsSnapshot(): Promise<SettingsSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const settings = await loadSettingsMap(db);
    const defaultProfile = getDefaultUserProfile();
    const currentUserName = settings.get("current_user_name")?.trim() || defaultProfile.currentUserName;
    const currentUserRole = normalizeUserRole(settings.get("current_user_role"));
    const parsedLocalUsers = (() => {
      const raw = settings.get("local_users");
      if (!raw) {
        return getDefaultLocalUsers();
      }

      try {
        return normalizeLocalUsers(JSON.parse(raw));
      } catch {
        return getDefaultLocalUsers();
      }
    })();
    const resolvedUser = resolveActiveLocalUser(parsedLocalUsers, settings.get("active_local_user_id"));
    return {
      companyName: settings.get("company_name") || "Smart Tech Moda e Calcados",
      document: settings.get("document") || "12.345.678/0001-00",
      legalName: settings.get("legal_name") || "Smart Tech Moda e Calcados LTDA",
      stateRegistration: settings.get("state_registration") || "123.456.789.112",
      companyPhone: settings.get("company_phone") || "(11) 4003-1020",
      companyWhatsapp: settings.get("company_whatsapp") || "(11) 99888-1020",
      companyEmail: settings.get("company_email") || "operacao@smarttechpdv.local",
      addressLine: settings.get("address_line") || "Rua do Comercio",
      addressNumber: settings.get("address_number") || "245",
      addressDistrict: settings.get("address_district") || "Centro",
      addressCity: settings.get("address_city") || "Sao Paulo",
      addressState: settings.get("address_state") || "SP",
      addressPostalCode: settings.get("address_postal_code") || "01010-100",
      theme: settings.get("theme") || "Windows Contrast",
      activeLocalUserId: resolvedUser.activeLocalUserId,
      localUsers: resolvedUser.localUsers,
      currentUserName: resolvedUser.currentUserName || currentUserName,
      currentUserRole: resolvedUser.currentUserRole || currentUserRole,
      notifyUpdates: settings.get("notify_updates") || "on",
      notifyLowStock: settings.get("notify_low_stock") || "on",
      notifyOrders: settings.get("notify_orders") || "on",
      notifyFinance: settings.get("notify_finance") || "on",
      notifySync: settings.get("notify_sync") || "on",
      thermalPrinter58: settings.get("thermal_printer_58") || "POS-RAM BT 58mm",
      thermalPrinter80: settings.get("thermal_printer_80") || "POS-RAM BT 80mm",
      defaultSalePrintTemplate: settings.get("default_sale_print_template") || "tpl-58",
      defaultLabelTemplate: settings.get("default_label_template") || "tpl-label",
      salePrintBehavior: settings.get("sale_print_behavior") || "preview",
      autoBackup: settings.get("auto_backup") || "Diario as 22:00",
      updaterChannel: settings.get("updater_channel") || "stable"
    };
  }

  async updateSettings(input: Partial<SettingsSnapshot>): Promise<SettingsSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const mapping: Array<[keyof SettingsSnapshot, string]> = [
      ["companyName", "company_name"],
      ["document", "document"],
      ["legalName", "legal_name"],
      ["stateRegistration", "state_registration"],
      ["companyPhone", "company_phone"],
      ["companyWhatsapp", "company_whatsapp"],
      ["companyEmail", "company_email"],
      ["addressLine", "address_line"],
      ["addressNumber", "address_number"],
      ["addressDistrict", "address_district"],
      ["addressCity", "address_city"],
      ["addressState", "address_state"],
      ["addressPostalCode", "address_postal_code"],
      ["theme", "theme"],
      ["activeLocalUserId", "active_local_user_id"],
      ["currentUserName", "current_user_name"],
      ["currentUserRole", "current_user_role"],
      ["notifyUpdates", "notify_updates"],
      ["notifyLowStock", "notify_low_stock"],
      ["notifyOrders", "notify_orders"],
      ["notifyFinance", "notify_finance"],
      ["notifySync", "notify_sync"],
      ["thermalPrinter58", "thermal_printer_58"],
      ["thermalPrinter80", "thermal_printer_80"],
      ["defaultSalePrintTemplate", "default_sale_print_template"],
      ["defaultLabelTemplate", "default_label_template"],
      ["salePrintBehavior", "sale_print_behavior"],
      ["autoBackup", "auto_backup"],
      ["updaterChannel", "updater_channel"]
    ];

    for (const [field, key] of mapping) {
      const nextValue = input[field];
      if (typeof nextValue !== "string") {
        continue;
      }
      await db.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, nextValue]
      );
    }

    if (input.localUsers) {
      await db.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        ["local_users", JSON.stringify(normalizeLocalUsers(input.localUsers))]
      );
    }

    return this.getSettingsSnapshot();
  }

  async getDiagnosticsSnapshot(): Promise<DiagnosticsSnapshot> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const snapshot = await this.getStockSnapshot();
    const settings = await loadSettingsMap(db);
    const patchRows = await selectRows<any>(db, "SELECT value FROM app_meta WHERE key = 'fashion_catalog_patch' LIMIT 1");
    const patchLevel = patchRows[0]?.value ? String(patchRows[0].value) : "base";
    return {
      databaseStatus: "SQLite conectado no runtime Tauri.",
      updaterStatus: "Aguardando release assinado.",
      lastBackupAt: new Date().toISOString(),
      environment: "TAURI_SQLITE",
      runtime: getRuntimeDiagnosticsSnapshot(),
      logs: [
        `[INFO] SQLite adapter pronto para produtos, vendas e estoque.`,
        `[INFO] Compatibilidade de migrations preservada com patch aditivo: ${patchLevel}.`,
        `[INFO] Loja carregada: ${settings.get("company_name") || "Smart Tech Moda e Calçados"}.`,
        `[INFO] Alertas ativos calculados em runtime: ${buildStockAlerts(await loadProducts(db)).length}.`,
        `[INFO] Valor do estoque recalculado: ${formatCurrency(snapshot.inventoryValue)}.`,
        ...getRecentAuditEntries(6).map((entry) => `[AUDIT] ${entry.area} · ${entry.action} · ${entry.details}`)
      ]
    };
  }

  async createCustomer(input: CustomerFormValues): Promise<Customer> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const name = input.name.trim();
    if (!name) {
      throw new Error("Informe pelo menos o nome do cliente para criar o cadastro.");
    }

    const customerId = `c-${crypto.randomUUID()}`;
    await db.execute(
      `INSERT INTO customers (id, name, phone, whatsapp, email, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [customerId, name, input.phone.trim(), (input.whatsapp || input.phone).trim(), input.email.trim(), input.notes.trim(), "active"]
    );

    const [customers, sales] = await Promise.all([loadCustomers(db), loadSales(db)]);
    const created = mergeCustomerMetrics(customers, sales).find((customer) => customer.id === customerId);
    if (!created) {
      throw new Error("Cliente criado, mas nao foi possivel recarregar a carteira.");
    }

    recordAuditEntry({
      area: "Clientes",
      action: "Cliente criado",
      details: `${created.name} entrou na carteira local para atendimento e recompra.`
    });

    return created;
  }

  async createProduct(input: ProductFormValues): Promise<Product> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const productId = `p-${crypto.randomUUID()}`;
    await db.execute(
      `INSERT INTO products (
        id, sector, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
        cost_price, sale_price, promotional_price, tags, status, image_hint, image_data_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        productId,
        input.sector,
        input.name,
        input.sku,
        input.internalCode,
        input.barcode,
        input.brandId,
        input.categoryId,
        input.subcategory,
        input.gender,
        input.material,
        input.color,
        input.costPrice,
        input.salePrice,
        input.promotionalPrice ?? null,
        input.tags.join(","),
        input.status,
        input.imageHint,
        input.imageDataUrl ?? null
      ]
    );

    for (const size of input.sizes) {
      await db.execute(
        "INSERT INTO product_variants (id, product_id, size, stock, reserved) VALUES (?, ?, ?, ?, ?)",
        [`${productId}-${size.size}`, productId, size.size, size.stock, 0]
      );
    }

    const products = await loadProducts(db);
    const created = products.find((product) => product.id === productId);
    if (!created) {
      throw new Error("Produto criado, mas nao foi possivel recarregar o cadastro.");
    }

    recordAuditEntry({
      area: "Produtos",
      action: "Cadastro criado",
      details: `${created.name} (${created.sku}) entrou no catálogo local.`
    });

    return created;
  }

  async updateProduct(productId: string, input: ProductFormValues): Promise<Product> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute(
      `UPDATE products SET
        sector = ?, name = ?, sku = ?, internal_code = ?, barcode = ?, brand_id = ?, category_id = ?, subcategory = ?,
        gender = ?, material = ?, color = ?, cost_price = ?, sale_price = ?, promotional_price = ?, tags = ?, status = ?,
        image_hint = ?, image_data_url = ?
       WHERE id = ?`,
      [
        input.sector,
        input.name,
        input.sku,
        input.internalCode,
        input.barcode,
        input.brandId,
        input.categoryId,
        input.subcategory,
        input.gender,
        input.material,
        input.color,
        input.costPrice,
        input.salePrice,
        input.promotionalPrice ?? null,
        input.tags.join(","),
        input.status,
        input.imageHint,
        input.imageDataUrl ?? null,
        productId
      ]
    );

    await db.execute("DELETE FROM product_variants WHERE product_id = ?", [productId]);

    for (const size of input.sizes) {
      await db.execute(
        "INSERT INTO product_variants (id, product_id, size, stock, reserved) VALUES (?, ?, ?, ?, ?)",
        [`${productId}-${size.size}`, productId, size.size, size.stock, 0]
      );
    }

    const products = await loadProducts(db);
    const updated = products.find((product) => product.id === productId);
    if (!updated) {
      throw new Error("Produto atualizado, mas nao foi possivel recarregar o cadastro.");
    }

    recordAuditEntry({
      area: "Produtos",
      action: updated.status === "inactive" ? "Produto inativado" : "Produto atualizado",
      details: `${updated.name} foi salvo com foco em ${updated.sector}.`
    });

    return updated;
  }

  async updateCustomer(customerId: string, input: CustomerFormValues): Promise<Customer> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute(
      `UPDATE customers SET
        name = ?, phone = ?, whatsapp = ?, email = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.name, input.phone, input.whatsapp, input.email, input.notes, customerId]
    );

    const [customers, sales] = await Promise.all([loadCustomers(db), loadSales(db)]);
    const updated = mergeCustomerMetrics(customers, sales).find((customer) => customer.id === customerId);
    if (!updated) {
      throw new Error("Cliente atualizado, mas nao foi possivel recarregar a carteira.");
    }

    recordAuditEntry({
      area: "Clientes",
      action: "Cliente atualizado",
      details: `${updated.name} teve cadastro revisado localmente.`
    });

    return updated;
  }


  async updateCustomerStatus(customerId: string, status: Customer["status"]): Promise<Customer> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute("UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, customerId]);

    const [customers, sales] = await Promise.all([loadCustomers(db), loadSales(db)]);
    const updated = mergeCustomerMetrics(customers, sales).find((customer) => customer.id === customerId);
    if (!updated) {
      throw new Error("Cliente atualizado, mas nao foi possivel recarregar a carteira.");
    }

    recordAuditEntry({
      area: "Clientes",
      action: status === "inactive" ? "Cliente inativado" : "Cliente reativado",
      details: `${updated.name} ficou com status ${status}.`
    });

    return updated;
  }

  async createSupplier(input: SupplierFormValues): Promise<Supplier> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const supplierId = `s-${crypto.randomUUID()}`;
    await db.execute(
      `INSERT INTO suppliers (id, name, cnpj, contact, email, lead_time_days, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [supplierId, input.name, input.cnpj, input.contact, input.email, input.leadTimeDays, "active"]
    );

    const suppliers = await this.getSuppliers();
    const created = suppliers.find((supplier) => supplier.id === supplierId);
    if (!created) {
      throw new Error("Fornecedor criado, mas nao foi possivel recarregar a base.");
    }

    recordAuditEntry({
      area: "Fornecedores",
      action: "Fornecedor criado",
      details: `${created.name} entrou na base local de parceiros.`
    });

    return created;
  }

  async updateSupplier(supplierId: string, input: SupplierFormValues): Promise<Supplier> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute(
      `UPDATE suppliers SET
        name = ?, cnpj = ?, contact = ?, email = ?, lead_time_days = ?
       WHERE id = ?`,
      [input.name, input.cnpj, input.contact, input.email, input.leadTimeDays, supplierId]
    );

    const suppliers = await this.getSuppliers();
    const updated = suppliers.find((supplier) => supplier.id === supplierId);
    if (!updated) {
      throw new Error("Fornecedor atualizado, mas nao foi possivel recarregar a base.");
    }

    recordAuditEntry({
      area: "Fornecedores",
      action: "Fornecedor atualizado",
      details: `${updated.name} teve contato/prazo ajustados.`
    });

    return updated;
  }


  async updateSupplierStatus(supplierId: string, status: Supplier["status"]): Promise<Supplier> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute("UPDATE suppliers SET status = ? WHERE id = ?", [status, supplierId]);
    const suppliers = await this.getSuppliers();
    const updated = suppliers.find((supplier) => supplier.id === supplierId);
    if (!updated) {
      throw new Error("Fornecedor atualizado, mas nao foi possivel recarregar a base.");
    }

    recordAuditEntry({
      area: "Fornecedores",
      action: status === "inactive" ? "Fornecedor inativado" : "Fornecedor reativado",
      details: `${updated.name} ficou com status ${status}.`
    });

    return updated;
  }

  async updateOrderStatus(orderId: string, status: Order["status"]): Promise<Order> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    await db.execute("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, orderId]);
    const orders = await this.getOrders();
    const updated = orders.find((order) => order.id === orderId);
    if (!updated) {
      throw new Error("Pedido atualizado, mas nao foi possivel recarregar a fila.");
    }

    recordAuditEntry({
      area: "Pedidos",
      action: "Status atualizado",
      details: `${updated.id} passou para ${updated.status}.`
    });

    return updated;
  }

  async updatePurchaseStatus(purchaseId: string, status: Purchase["status"]): Promise<Purchase> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const receivedAt = status === "recebida" ? new Date().toISOString() : null;
    await db.execute("UPDATE purchases SET status = ?, received_at = ? WHERE id = ?", [status, receivedAt, purchaseId]);
    const purchases = await this.getPurchases();
    const updated = purchases.find((purchase) => purchase.id === purchaseId);
    if (!updated) {
      throw new Error("Compra atualizada, mas nao foi possivel recarregar o lote.");
    }

    recordAuditEntry({
      area: "Compras",
      action: "Status de compra atualizado",
      details: `${updated.id} passou para ${updated.status}.`
    });

    return updated;
  }

  async updateFinancialEntry(entryId: string, input: FinancialEntryUpdateInput): Promise<FinancialEntry> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const entries = await this.getFinancialEntries();
    const current = entries.find((entry) => entry.id === entryId);
    if (!current) {
      throw new Error("Lancamento financeiro nao encontrado.");
    }

    await db.execute(
      "UPDATE financial_entries SET status = ?, due_at = ? WHERE id = ?",
      [input.status ?? current.status, input.dueAt ?? current.dueAt, entryId]
    );

    const updatedEntries = await this.getFinancialEntries();
    const updated = updatedEntries.find((entry) => entry.id === entryId);
    if (!updated) {
      throw new Error("Lancamento financeiro atualizado, mas nao foi possivel recarregar o titulo.");
    }

    recordAuditEntry({
      area: "Financeiro",
      action: "Lançamento atualizado",
      details: `${updated.description} ficou com status ${updated.status}.`
    });

    return updated;
  }

  async createPurchase(input: PurchaseCreateInput): Promise<Purchase> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    if (input.unitCost <= 0) {
      throw new Error("O custo unitario precisa ser maior que zero.");
    }

    const [products, suppliers] = await Promise.all([this.getProducts(), this.getSuppliers()]);
    const selectedProduct = products.find((product) => product.id === input.productId);
    if (!selectedProduct) {
      throw new Error("Produto nao encontrado para abrir a compra.");
    }
    const selectedSupplier = suppliers.find((supplier) => supplier.id === input.supplierId);
    if (!selectedSupplier) {
      throw new Error("Fornecedor nao encontrado para abrir a compra.");
    }

    const normalizedLines =
      input.sizeBreakdown?.filter((entry) => entry.quantity > 0).map((entry) => ({
        id: `pi-${crypto.randomUUID()}`,
        purchaseId: "",
        productId: input.productId,
        quantity: entry.quantity,
        unitCost: input.unitCost,
        size: entry.size
      })) ?? [];
    const resolvedQuantity = normalizedLines.length > 0 ? normalizedLines.reduce((sum, entry) => sum + entry.quantity, 0) : input.quantity;

    if (resolvedQuantity <= 0) {
      throw new Error("A quantidade da compra precisa ser maior que zero.");
    }

    if ((input.status ?? "aberta") === "recebida" && normalizedLines.length === 0) {
      throw new Error("Para marcar a compra como recebida, distribua o lote por grade antes de salvar.");
    }

    for (const line of normalizedLines) {
      const hasVariant = selectedProduct.variants.some((variant) => variant.size === line.size);
      if (!hasVariant) {
        throw new Error(`A grade ${line.size} nao existe mais para ${selectedProduct.name}.`);
      }
    }

    const purchaseId = `P-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const total = Number((resolvedQuantity * input.unitCost).toFixed(2));
    const status = input.status ?? "aberta";

    await runInSerializedSqliteWrite(() =>
      runWithSqliteLockRetry(async () => {
        await db.execute("BEGIN IMMEDIATE TRANSACTION");

        try {
          await db.execute(
            "INSERT INTO purchases (id, supplier_id, status, total, received_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [purchaseId, input.supplierId, status, total, status === "recebida" ? createdAt : null, createdAt]
          );

          if (normalizedLines.length > 0) {
            for (const line of normalizedLines) {
              await db.execute(
                "INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, size) VALUES (?, ?, ?, ?, ?, ?)",
                [line.id, purchaseId, line.productId, line.quantity, line.unitCost, line.size]
              );

              if (status === "recebida") {
                await db.execute("UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND size = ?", [line.quantity, line.productId, line.size]);
                await db.execute(
                  "INSERT INTO stock_movements (id, product_id, type, quantity, reason, created_at, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  [`m-${crypto.randomUUID()}`, line.productId, "entrada", line.quantity, `Recebimento da compra ${purchaseId}`, createdAt, line.size]
                );
              }
            }
          } else {
            await db.execute(
              "INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, size) VALUES (?, ?, ?, ?, ?, ?)",
              [`pi-${crypto.randomUUID()}`, purchaseId, input.productId, input.quantity, input.unitCost, null]
            );
          }
          await db.execute(
            "INSERT INTO financial_entries (id, type, description, amount, status, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              `f-${crypto.randomUUID()}`,
              "pagar",
              `Compra ${purchaseId} - ${selectedSupplier.name}`,
              total,
              "aberto",
              buildFinanceDueAtFromDays(createdAt, selectedSupplier.leadTimeDays),
              createdAt
            ]
          );
          await db.execute("COMMIT");
        } catch (error) {
          try {
            await db.execute("ROLLBACK");
          } catch {
            /* noop */
          }
          throw error;
        }
      })
    );

    const purchases = await this.getPurchases();
    const created = purchases.find((purchase) => purchase.id === purchaseId);
    if (!created) {
      throw new Error("Compra criada, mas nao foi possivel recarregar o lote.");
    }

    const reloadedProducts = await this.getProducts();
    const supplier = selectedSupplier;
    const product = reloadedProducts.find((item) => item.id === input.productId);

    recordAuditEntry({
      area: "Compras",
      action: "Compra criada",
      details: `${created.id} aberta com ${supplier?.name ?? input.supplierId} para ${product?.name ?? input.productId}.`
    });

    return created;
  }

  async receivePurchaseIntoStock(input: PurchaseReceiptInput): Promise<Purchase> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const purchase = (await this.getPurchases()).find((entry) => entry.id === input.purchaseId);
    if (!purchase) {
      throw new Error("Compra nao encontrada para recebimento.");
    }

    const normalizedLines = input.lines.filter((line) => line.quantity > 0);
    if (!normalizedLines.length) {
      throw new Error("Informe ao menos uma grade com quantidade para receber a compra no estoque.");
    }

    const products = await this.getProducts();
    for (const line of normalizedLines) {
      const product = products.find((entry) => entry.id === line.productId);
      if (!product) {
        throw new Error("Produto da compra nao foi encontrado para recebimento.");
      }

      const variant = product.variants.find((entry) => entry.size === line.size);
      if (!variant) {
        throw new Error(`A grade ${line.size} nao existe mais para ${product.name}.`);
      }
    }

    const receivedAt = new Date().toISOString();

    await runInSerializedSqliteWrite(() =>
      runWithSqliteLockRetry(async () => {
        await db.execute("BEGIN IMMEDIATE TRANSACTION");

        try {
          for (const line of normalizedLines) {
            await db.execute("UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND size = ?", [line.quantity, line.productId, line.size]);
            await db.execute(
              "INSERT INTO stock_movements (id, product_id, type, quantity, reason, created_at, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [`m-${crypto.randomUUID()}`, line.productId, "entrada", line.quantity, input.reason, receivedAt, line.size]
            );
          }

          await db.execute("UPDATE purchases SET status = ?, received_at = ? WHERE id = ?", ["recebida", receivedAt, input.purchaseId]);
          await db.execute("COMMIT");
        } catch (error) {
          try {
            await db.execute("ROLLBACK");
          } catch {
            /* noop */
          }
          throw error;
        }
      })
    );

    const updated = (await this.getPurchases()).find((entry) => entry.id === input.purchaseId);
    if (!updated) {
      throw new Error("Compra recebida, mas nao foi possivel recarregar o lote.");
    }

    recordAuditEntry({
      area: "Compras",
      action: "Compra recebida no estoque",
      details: `${input.purchaseId} entrou no estoque com ${normalizedLines.length} grade(s) conferidas.`
    });

    return updated;
  }

  async createFinancialEntry(input: FinancialEntryCreateInput): Promise<FinancialEntry> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    if (!input.description.trim()) {
      throw new Error("Informe a descricao do lancamento.");
    }

    if (input.amount <= 0) {
      throw new Error("O valor do lancamento precisa ser maior que zero.");
    }

    const normalizedDescription = input.description.trim().toLowerCase();
    if (normalizedDescription.startsWith("pedido ")) {
      const existingRows = await selectRows<any>(
        db,
        "SELECT id FROM financial_entries WHERE LOWER(description) LIKE ? LIMIT 1",
        [`%${normalizedDescription}%`]
      );
      if (existingRows.length > 0) {
        throw new Error("Ja existe um lancamento financeiro para esse pedido.");
      }
    }

    const entryId = `f-${crypto.randomUUID()}`;
    const normalizedStatus = input.status ?? "aberto";
    await db.execute(
      "INSERT INTO financial_entries (id, type, description, amount, status, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [entryId, input.type, input.description.trim(), input.amount, normalizedStatus, input.dueAt, new Date().toISOString()]
    );

    const entries = await this.getFinancialEntries();
    const created = entries.find((entry) => entry.id === entryId);
    if (!created) {
      throw new Error("Lancamento criado, mas nao foi possivel recarregar o financeiro.");
    }

    recordAuditEntry({
      area: "Financeiro",
      action: input.type === "receber" ? "Receita lançada" : "Despesa lançada",
      details: `${created.description} entrou no financeiro local em ${formatCurrency(created.amount)}.`
    });

    return created;
  }

  async createStockMovement(input: StockMovementDraft): Promise<StockMovement> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const movementId = `m-${crypto.randomUUID()}`;
    await db.execute("UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND size = ?", [input.quantity, input.productId, input.size]);
    await db.execute(
      "INSERT INTO stock_movements (id, product_id, type, quantity, reason, size) VALUES (?, ?, ?, ?, ?, ?)",
      [movementId, input.productId, input.type, input.quantity, input.reason, input.size]
    );

    const products = await loadProducts(db);
    const product = products.find((item) => item.id === input.productId);
    recordAuditEntry({
      area: "Estoque",
      action: "Movimentação registrada",
      details: `${input.type} de ${input.quantity} em ${product?.name ?? input.productId} (${input.size}). Motivo: ${input.reason}.`
    });

    return {
      id: movementId,
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      createdAt: new Date().toISOString(),
      reason: input.reason,
      size: input.size
    };
  }

  async createSale(input: SaleDraft): Promise<Sale> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    if (!input.items.length) {
      throw new Error("Adicione ao menos um item para finalizar a venda.");
    }

    if (!input.paymentMethods.length) {
      throw new Error("Selecione ao menos uma forma de pagamento.");
    }

    if (input.total < 0 || input.subtotal < 0 || input.discount < 0) {
      throw new Error("Os valores da venda estao invalidos para fechamento.");
    }

    const [products, customers] = await Promise.all([loadProducts(db), loadCustomers(db)]);

    if (input.customerId) {
      const customerExists = customers.some((customer) => customer.id === input.customerId);
      if (!customerExists) {
        throw new Error("O cliente selecionado nao existe mais na base local. Recarregue e tente novamente.");
      }
    }

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error(`Quantidade invalida para ${item.name}.`);
      }

      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        throw new Error(`Produto ${item.name} nao foi encontrado na base local.`);
      }

      const variant = product.variants.find((entry) => entry.size === item.size);
      if (!variant) {
        throw new Error(`A grade ${item.size} de ${product.name} nao foi encontrada.`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name} ${item.size}. Disponivel: ${variant.stock}.`);
      }
    }

    const saleId = `V-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    try {
      await runInSerializedSqliteWrite(() =>
        runWithSqliteLockRetry(async () => {
        await db.execute("BEGIN IMMEDIATE TRANSACTION");

        try {
          await db.execute(
            "INSERT INTO sales (id, customer_id, subtotal, discount, total, payment_methods, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [saleId, input.customerId ?? null, input.subtotal, input.discount, input.total, input.paymentMethods.join(","), createdAt]
          );

          for (const item of input.items) {
            await db.execute("UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND size = ?", [item.quantity, item.productId, item.size]);
            await db.execute(
              "INSERT INTO sale_items (id, sale_id, product_id, size, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)",
              [`si-${crypto.randomUUID()}`, saleId, item.productId, item.size, item.quantity, item.unitPrice]
            );
            await db.execute(
              "INSERT INTO stock_movements (id, product_id, type, quantity, reason, created_at, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [`m-${crypto.randomUUID()}`, item.productId, "saida", -item.quantity, `Venda ${saleId}`, createdAt, item.size]
            );
          }

          await db.execute(
            "INSERT INTO financial_entries (id, type, description, amount, status, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              `f-${crypto.randomUUID()}`,
              "receber",
              `Venda ${saleId} - ${input.paymentMethods.join(" + ")}`,
              input.total,
              input.paymentMethods.includes("Dinheiro") || input.paymentMethods.includes("Pix") ? "pago" : "aberto",
              createdAt,
              createdAt
            ]
          );

          await db.execute("COMMIT");
        } catch (error) {
          try {
            await db.execute("ROLLBACK");
          } catch {
            /* noop */
          }
          throw error;
        }
        })
      );
    } catch (error) {
      const message = getErrorMessage(error, "Nao foi possivel finalizar a venda no banco local.");

      if (isDatabaseLockedError(error)) {
        throw new Error("O banco local estava ocupado por alguns instantes. Tente finalizar novamente em 1 segundo.");
      }

      if (message.toLowerCase().includes("foreign key")) {
        throw new Error("A venda referencia um cadastro ausente no banco local. Reabra o PDV e tente novamente.");
      }

      if (message.toLowerCase().includes("constraint")) {
        throw new Error("O banco local recusou a venda por inconsistência de dados. Revise cliente, itens e pagamento.");
      }

      throw new Error(message);
    }

    const sale: Sale = {
      id: saleId,
      customerId: input.customerId,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      paymentMethods: input.paymentMethods,
      createdAt,
      items: input.items.map((item) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    try {
      await syncQueueService.enqueue({
        entityType: "sale",
        entityId: saleId,
        operation: "create",
        idempotencyKey: `sale:${saleId}:create`,
        payload: {
          id: sale.id,
          customerId: sale.customerId,
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          paymentMethods: sale.paymentMethods,
          createdAt: sale.createdAt,
          items: sale.items
        }
      });
    } catch {
      /* Venda ja persistida; fila de sync e best-effort */
    }

    recordAuditEntry({
      area: "PDV",
      action: "Venda finalizada",
      details: `${sale.id} fechada em ${formatCurrency(sale.total)} com ${sale.paymentMethods.join(" + ")}.`
    });

    return sale;
  }

  async generateStressTestData(preset: StressTestPreset): Promise<StressTestLoadResult> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const counts = STRESS_PRESET_COUNTS[preset];
    const [categories, brands, suppliers, existingCustomers] = await Promise.all([
      this.getCategories(),
      this.getBrands(),
      this.getSuppliers(),
      this.getCustomers()
    ]);

    if (!categories.length || !brands.length || !suppliers.length) {
      throw new Error("A base local precisa ter categorias, marcas e fornecedores para gerar carga fake.");
    }

    const createdCustomers: Customer[] = [];
    const createdProducts: Product[] = [];
    const createdSales: Sale[] = [];
    const createdOrders: Order[] = [];
    const createdPurchases: Purchase[] = [];
    const createdFinancialEntries: FinancialEntry[] = [];
    let stockMovementsCreated = 0;

    const customerPool = [...existingCustomers];

    try {
      await db.execute("BEGIN TRANSACTION");

      for (let index = 0; index < counts.customers; index += 1) {
        const firstName = STRESS_FIRST_NAMES[index % STRESS_FIRST_NAMES.length];
        const lastName = STRESS_LAST_NAMES[(index * 3) % STRESS_LAST_NAMES.length];
        const customerId = `stress-c-${crypto.randomUUID()}`;
        const suffix = String(index + 1).padStart(3, "0");
        const phoneBlock = String(4000 + (index % 5000)).padStart(4, "0");
        const phoneTail = String(1000 + ((index * 17) % 9000)).padStart(4, "0");
        const customer: Customer = {
          id: customerId,
          status: "active",
          name: `${firstName} ${lastName}`,
          phone: `(11) 9${phoneBlock}-${phoneTail}`,
          whatsapp: `(11) 9${phoneBlock}-${phoneTail}`,
          email: `stress.cliente.${suffix}@smarttech.local`,
          lastPurchaseAt: new Date(Date.now() - index * 86_400_000).toISOString(),
          averageTicket: 0,
          lifetimeValue: 0,
          notes: `Cliente fake ${suffix} para teste operacional.`
        };

        await db.execute(
          "INSERT INTO customers (id, name, phone, whatsapp, email, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          [customer.id, customer.name, customer.phone, customer.whatsapp, customer.email, customer.notes, customer.status]
        );

        createdCustomers.push(customer);
        customerPool.push(customer);
      }

      for (let index = 0; index < counts.products; index += 1) {
        const sector = index % 2 === 0 ? "calcados" : "roupas";
        const sectorCategories = categories.filter((category) => category.sector === sector);
        const category = sectorCategories[index % Math.max(sectorCategories.length, 1)] ?? categories[0];
        const brand = brands[index % brands.length];
        const templateName = sector === "calcados"
          ? ["Urban Motion", "Atelier Sole", "Nord Trail"][index % 3]
          : ["Blusa Soft", "Jeans City", "Vestido Aura"][index % 3];
        const color = STRESS_COLORS[index % STRESS_COLORS.length];
        const sizes = sector === "calcados" ? ["37", "38", "39", "40", "41", "42"] : ["P", "M", "G", "GG"];
        const salePrice = Number((sector === "calcados" ? 179.9 + (index % 7) * 26 : 79.9 + (index % 7) * 16).toFixed(2));
        const costPrice = Number((salePrice * 0.54).toFixed(2));
        const productId = `stress-p-${crypto.randomUUID()}`;
        const productName = `${templateName} ${index + 1}`;
        const productSku = `STRESS-${sector === "calcados" ? "CAL" : "ROP"}-${String(index + 1).padStart(4, "0")}`;
        const promotionalPrice = index % 4 === 0 ? Number((salePrice * 0.92).toFixed(2)) : undefined;

        await db.execute(
          `INSERT INTO products (
            id, sector, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
            cost_price, sale_price, promotional_price, tags, status, image_hint, image_data_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            sector,
            productName,
            productSku,
            `INT-${String(index + 1).padStart(5, "0")}`,
            `7899${String(10000000 + index).padStart(8, "0")}`,
            brand.id,
            category.id,
            sector === "calcados" ? "Linha premium" : "Linha moda",
            sector === "roupas" && index % 3 === 0 ? "Feminino" : "Unissex",
            sector === "calcados" ? "Couro/Knit" : "Malha premium",
            color,
            costPrice,
            salePrice,
            promotionalPrice ?? null,
            `stress,carga,${sector}`,
            "active",
            `${templateName.toLowerCase()} ${color.toLowerCase()}`,
            null
          ]
        );

        const variants = sizes.map((size, sizeIndex) => ({
          id: `${productId}-${size}`,
          size,
          stock: 8 + ((index + 1) * (sizeIndex + 2)) % 15,
          reserved: sizeIndex % 3 === 0 ? 1 : 0
        }));

        for (const variant of variants) {
          await db.execute(
            "INSERT INTO product_variants (id, product_id, size, stock, reserved) VALUES (?, ?, ?, ?, ?)",
            [variant.id, productId, variant.size, variant.stock, variant.reserved]
          );
        }

        const totalUnits = variants.reduce((sum, variant) => sum + variant.stock, 0);
        await db.execute(
          "INSERT INTO stock_movements (id, product_id, type, quantity, reason, size, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
          [`m-${crypto.randomUUID()}`, productId, "entrada", totalUnits, "Carga fake operacional", "grade"]
        );
        stockMovementsCreated += 1;

        createdProducts.push({
          id: productId,
          sector,
          name: productName,
          sku: productSku,
          internalCode: `INT-${String(index + 1).padStart(5, "0")}`,
          barcode: `7899${String(10000000 + index).padStart(8, "0")}`,
          brandId: brand.id,
          categoryId: category.id,
          subcategory: sector === "calcados" ? "Linha premium" : "Linha moda",
          gender: sector === "roupas" && index % 3 === 0 ? "Feminino" : "Unissex",
          material: sector === "calcados" ? "Couro/Knit" : "Malha premium",
          color,
          costPrice,
          salePrice,
          promotionalPrice,
          tags: ["stress", "carga", sector],
          status: "active",
          imageHint: `${templateName.toLowerCase()} ${color.toLowerCase()}`,
          imageDataUrl: undefined,
          sales30d: 0,
          variants
        });
      }

      for (let index = 0; index < counts.sales; index += 1) {
        const product = createdProducts[index % createdProducts.length];
        const variant = product.variants.find((entry) => entry.stock > 1);
        if (!variant) {
          continue;
        }

        const quantity = 1 + (index % 2);
        if (variant.stock < quantity) {
          continue;
        }

        variant.stock -= quantity;
        const createdAt = new Date(Date.now() - index * 3_600_000).toISOString();
        const unitPrice = product.promotionalPrice ?? product.salePrice;
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        const paymentMethods = [(["Pix", "Cartao", "Dinheiro", "Crediario"] as const)[index % 4]];
        const customer = customerPool[index % customerPool.length];
        const saleId = `V-STRESS-${crypto.randomUUID()}`;

        await db.execute(
          "INSERT INTO sales (id, customer_id, subtotal, discount, total, payment_methods, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [saleId, customer?.id ?? null, subtotal, 0, subtotal, paymentMethods.join(","), createdAt]
        );
        await db.execute(
          "INSERT INTO sale_items (id, sale_id, product_id, size, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)",
          [`si-${crypto.randomUUID()}`, saleId, product.id, variant.size, quantity, unitPrice]
        );
        await db.execute(
          "UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND size = ?",
          [quantity, product.id, variant.size]
        );
        await db.execute(
          "INSERT INTO stock_movements (id, product_id, type, quantity, reason, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [`m-${crypto.randomUUID()}`, product.id, "saida", -quantity, `Carga fake ${saleId}`, variant.size, createdAt]
        );
        stockMovementsCreated += 1;

        const financialEntry: FinancialEntry = {
          id: `f-${crypto.randomUUID()}`,
          type: "receber",
          description: `Venda fake ${saleId}`,
          amount: subtotal,
          status: paymentMethods[0] === "Crediario" ? "aberto" : "pago",
          dueAt: createdAt
        };

        await db.execute(
          "INSERT INTO financial_entries (id, type, description, amount, status, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [financialEntry.id, financialEntry.type, financialEntry.description, financialEntry.amount, financialEntry.status, financialEntry.dueAt, createdAt]
        );

        createdFinancialEntries.push(financialEntry);
        createdSales.push({
          id: saleId,
          customerId: customer?.id,
          subtotal,
          discount: 0,
          total: subtotal,
          paymentMethods: [...paymentMethods],
          createdAt,
          items: [{ productId: product.id, size: variant.size, quantity, unitPrice }]
        });
      }

      for (let index = 0; index < counts.orders; index += 1) {
        const product = createdProducts[index % createdProducts.length];
        const customer = customerPool[index % customerPool.length];
        const orderId = `O-STRESS-${crypto.randomUUID()}`;
        const value = Number((119.9 + (index % 5) * 38).toFixed(2));
        const createdAt = new Date(Date.now() - index * 7_200_000).toISOString();
        await db.execute(
          "INSERT INTO orders (id, customer_id, status, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [orderId, customer.id, (["novo", "em separacao", "pronto"] as const)[index % 3], value, createdAt, createdAt]
        );
        await db.execute(
          "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
          [`oi-${crypto.randomUUID()}`, orderId, product.id, 1 + (index % 3), product.salePrice]
        );

        createdOrders.push({
          id: orderId,
          customerId: customer.id,
          status: (["novo", "em separacao", "pronto"] as const)[index % 3],
          value,
          createdAt,
          updatedAt: createdAt,
          items: 1 + (index % 3)
        });
      }

      for (let index = 0; index < counts.purchases; index += 1) {
        const product = createdProducts[index % createdProducts.length];
        const supplier = suppliers[index % suppliers.length];
        const purchaseId = `P-STRESS-${crypto.randomUUID()}`;
        const status = (["aberta", "conferida", "recebida"] as const)[index % 3];
        const firstLineQuantity = 2 + (index % 3);
        const secondLineQuantity = 2 + ((index + 1) % 3);
        const quantity = firstLineQuantity + secondLineQuantity;
        const total = Number((quantity * product.costPrice).toFixed(2));
        const createdAt = new Date(Date.now() - index * 172_800_000).toISOString();
        const receivedAt = status === "recebida" ? createdAt : null;
        const purchaseLines = product.variants.slice(0, 2).map((variant, lineIndex) => ({
          id: `pi-${crypto.randomUUID()}`,
          purchaseId,
          productId: product.id,
          quantity: lineIndex === 0 ? firstLineQuantity : secondLineQuantity,
          unitCost: product.costPrice,
          size: variant.size
        }));

        await db.execute(
          "INSERT INTO purchases (id, supplier_id, status, total, received_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [purchaseId, supplier.id, status, total, receivedAt, createdAt]
        );
        for (const line of purchaseLines) {
          await db.execute(
            "INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, size) VALUES (?, ?, ?, ?, ?, ?)",
            [line.id, line.purchaseId, line.productId, line.quantity, line.unitCost, line.size]
          );
        }

        createdPurchases.push({
          id: purchaseId,
          supplierId: supplier.id,
          productId: product.id,
          status,
          total,
          receivedAt: receivedAt ?? undefined,
          createdAt,
          items: purchaseLines.length,
          quantity,
          unitCost: product.costPrice,
          lines: purchaseLines
        });
        const payableEntry: FinancialEntry = {
          id: `f-${crypto.randomUUID()}`,
          type: "pagar",
          description: `Compra ${purchaseId} - ${supplier.name}`,
          amount: total,
          status: "aberto",
          dueAt: buildFinanceDueAtFromDays(createdAt, supplier.leadTimeDays)
        };
        await db.execute(
          "INSERT INTO financial_entries (id, type, description, amount, status, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [payableEntry.id, payableEntry.type, payableEntry.description, payableEntry.amount, payableEntry.status, payableEntry.dueAt, createdAt]
        );
        createdFinancialEntries.push(payableEntry);
      }

      await db.execute("COMMIT");
    } catch (error) {
      try {
        await db.execute("ROLLBACK");
      } catch {
        /* noop */
      }
      throw new Error(getErrorMessage(error, "Nao foi possivel gerar a carga fake operacional."));
    }

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

    const summary = `${baseResult.productsCreated} produtos, ${baseResult.customersCreated} clientes e ${baseResult.salesCreated} vendas fake carregados no SQLite local.`;
    recordAuditEntry({
      area: "Diagnostico",
      action: "Carga fake aplicada",
      details: summary
    });

    return {
      ...baseResult,
      summary
    };
  }

  async getProductStockHistory(productId: string): Promise<StockMovement[]> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");
    const rows = await selectRows<any>(db, "SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC", [productId]);
    return rows.map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      type: row.type,
      quantity: Number(row.quantity),
      createdAt: String(row.created_at),
      reason: String(row.reason ?? ""),
      size: row.size ? String(row.size) : undefined
    }));
  }
}
