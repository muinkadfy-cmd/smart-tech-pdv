import { buildProductCatalogSummary } from "@/features/products/product.service";
import { buildStockAlerts, buildStockSnapshot } from "@/features/stock/stock.service";
import type { AppRepository } from "@/repositories/app-repository";
import { getSqliteDatabase } from "@/services/database/sqlite-db";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { formatCurrency } from "@/lib/utils";
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
  ProductVariant,
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

async function selectRows<T = Record<string, unknown>>(db: any, sql: string, params?: unknown[]): Promise<T[]> {
  return (await db.select(sql, params)) as T[];
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
    variants: variantsByProduct.get(String(row.id)) ?? [],
    sales30d: Number(row.sales_30d ?? 0)
  }));
}

async function loadCustomers(db: any): Promise<Customer[]> {
  const rows = await selectRows<any>(db, "SELECT * FROM customers ORDER BY name");
  return rows.map((row) => ({
    id: String(row.id),
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
    return rows.map((row) => ({
      id: String(row.id),
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
    return rows.map((row) => ({
      id: String(row.id),
      supplierId: String(row.supplier_id),
      status: row.status,
      total: Number(row.total),
      receivedAt: row.received_at ? String(row.received_at) : undefined,
      createdAt: String(row.created_at),
      items: 0
    }));
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
    return {
      companyName: settings.get("company_name") || "Smart Tech Moda e Calcados",
      document: settings.get("document") || "12.345.678/0001-00",
      theme: settings.get("theme") || "Windows Contrast",
      thermalPrinter58: settings.get("thermal_printer_58") || "EPSON TM-T20 58mm",
      thermalPrinter80: settings.get("thermal_printer_80") || "ELGIN Flash 80mm",
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
      ["theme", "theme"],
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
      logs: [
        `[INFO] SQLite adapter pronto para produtos, vendas e estoque.`,
        `[INFO] Compatibilidade de migrations preservada com patch aditivo: ${patchLevel}.`,
        `[INFO] Loja carregada: ${settings.get("company_name") || "Smart Tech Moda e Calcados"}.`,
        `[INFO] Alertas ativos calculados em runtime: ${buildStockAlerts(await loadProducts(db)).length}.`,
        `[INFO] Valor do estoque recalculado: ${formatCurrency(snapshot.inventoryValue)}.`
      ]
    };
  }

  async createProduct(input: ProductFormValues): Promise<Product> {
    const db = await getSqliteDatabase();
    if (!db) throw new Error("SQLite indisponivel fora do runtime Tauri.");

    const productId = `p-${crypto.randomUUID()}`;
    await db.execute(
      `INSERT INTO products (
        id, sector, name, sku, internal_code, barcode, brand_id, category_id, subcategory, gender, material, color,
        cost_price, sale_price, promotional_price, tags, status, image_hint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
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
        input.imageHint
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

    const saleId = `V-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

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

    return sale;
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
