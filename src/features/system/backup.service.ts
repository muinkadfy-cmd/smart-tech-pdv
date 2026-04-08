import { APP_NAME, APP_VERSION } from "@/config/app";
import { formatDate } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { getSqliteDatabase } from "@/services/database/sqlite-db";

const META_EXPORT_AT = "last_backup_export_at";
const META_RESTORE_AT = "last_backup_restore_at";

const TABLES_IN_EXPORT_ORDER = [
  "categories",
  "brands",
  "products",
  "product_variants",
  "customers",
  "suppliers",
  "sales",
  "sale_items",
  "orders",
  "order_items",
  "purchases",
  "purchase_items",
  "stock_movements",
  "financial_entries",
  "settings",
  "app_meta",
  "sync_outbox",
  "license_snapshot",
  "audit_log"
] as const;

const TABLES_IN_CLEAR_ORDER = [...TABLES_IN_EXPORT_ORDER].reverse();

type BackupTableName = (typeof TABLES_IN_EXPORT_ORDER)[number];
type BackupTableRows = Array<Record<string, unknown>>;

type BackupTables = Record<BackupTableName, BackupTableRows>;

export interface BackupSnapshot {
  metadata: {
    appName: string;
    version: string;
    exportedAt: string;
    mode: "sqlite" | "demo";
    format: "smart-tech-backup-v1";
  };
  tables?: Partial<BackupTables>;
  logical?: Record<string, unknown>;
}

export interface BackupStatus {
  mode: "sqlite" | "demo";
  canRestore: boolean;
  lastExportAt: string | null;
  lastRestoreAt: string | null;
  helper: string;
  summary: Array<{ label: string; value: string }>;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function getMetaValue(key: string): Promise<string | null> {
  const db = await getSqliteDatabase();
  if (!db) {
    return localStorage.getItem(key);
  }

  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
    [key]
  );
  return rows[0]?.value ?? null;
}

async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await getSqliteDatabase();
  if (!db) {
    localStorage.setItem(key, value);
    return;
  }

  await db.execute(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
}

async function collectSqliteTables(): Promise<BackupTables> {
  const db = await getSqliteDatabase();
  if (!db) {
    throw new Error("SQLite indisponivel para gerar backup completo.");
  }

  const pairs = await Promise.all(
    TABLES_IN_EXPORT_ORDER.map(async (table) => {
      const rows = await db.select<BackupTableRows>(`SELECT * FROM ${table}`);
      return [table, rows ?? []] as const;
    })
  );

  return Object.fromEntries(pairs) as BackupTables;
}

async function collectLogicalSnapshot(): Promise<Record<string, unknown>> {
  const [
    dashboard,
    products,
    categories,
    brands,
    customers,
    orders,
    sales,
    suppliers,
    purchases,
    financialEntries,
    stock,
    reports,
    settings,
    diagnostics
  ] = await Promise.all([
    appRepository.getDashboardSnapshot(),
    appRepository.getProducts(),
    appRepository.getCategories(),
    appRepository.getBrands(),
    appRepository.getCustomers(),
    appRepository.getOrders(),
    appRepository.getSales(),
    appRepository.getSuppliers(),
    appRepository.getPurchases(),
    appRepository.getFinancialEntries(),
    appRepository.getStockSnapshot(),
    appRepository.getReportsSnapshot(),
    appRepository.getSettingsSnapshot(),
    appRepository.getDiagnosticsSnapshot()
  ]);

  return {
    dashboard,
    products,
    categories,
    brands,
    customers,
    orders,
    sales,
    suppliers,
    purchases,
    financialEntries,
    stock,
    reports,
    settings,
    diagnostics
  };
}

function buildFilename(exportedAt: string) {
  const normalized = exportedAt.replace(/[:.]/g, "-");
  return `smart-tech-backup-${normalized}.json`;
}

function isSqliteBackup(snapshot: BackupSnapshot): snapshot is BackupSnapshot & { tables: Partial<BackupTables> } {
  return Boolean(snapshot.tables && typeof snapshot.tables === "object");
}

async function clearAllTables(): Promise<void> {
  const db = await getSqliteDatabase();
  if (!db) {
    throw new Error("Restauracao disponivel apenas no runtime desktop com SQLite.");
  }

  for (const table of TABLES_IN_CLEAR_ORDER) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

async function insertTableRows(table: BackupTableName, rows: BackupTableRows) {
  const db = await getSqliteDatabase();
  if (!db || rows.length === 0) {
    return;
  }

  for (const row of rows) {
    const entries = Object.entries(row);
    if (entries.length === 0) {
      continue;
    }

    const columns = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);
    const placeholders = columns.map(() => "?").join(", ");

    await db.execute(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
      values
    );
  }
}

function buildSummaryEntries(params: {
  products: number;
  customers: number;
  sales: number;
  movements: number;
  lastExportAt: string | null;
  lastRestoreAt: string | null;
}) {
  return [
    { label: "Produtos", value: String(params.products) },
    { label: "Clientes", value: String(params.customers) },
    { label: "Vendas", value: String(params.sales) },
    { label: "Movimentacoes", value: String(params.movements) },
    { label: "Ultimo backup", value: params.lastExportAt ? formatDate(params.lastExportAt) : "Nenhum" },
    { label: "Ultima restauracao", value: params.lastRestoreAt ? formatDate(params.lastRestoreAt) : "Nenhuma" }
  ];
}

export const backupService = {
  async getStatus(): Promise<BackupStatus> {
    const db = await getSqliteDatabase();
    const [lastExportAt, lastRestoreAt] = await Promise.all([
      getMetaValue(META_EXPORT_AT),
      getMetaValue(META_RESTORE_AT)
    ]);

    if (db) {
      const [products, customers, sales, movements] = await Promise.all([
        db.select<Array<{ c: number }>>("SELECT COUNT(*) as c FROM products"),
        db.select<Array<{ c: number }>>("SELECT COUNT(*) as c FROM customers"),
        db.select<Array<{ c: number }>>("SELECT COUNT(*) as c FROM sales"),
        db.select<Array<{ c: number }>>("SELECT COUNT(*) as c FROM stock_movements")
      ]);

      return {
        mode: "sqlite",
        canRestore: true,
        lastExportAt,
        lastRestoreAt,
        helper: "Backup completo em JSON com restauracao real sobre a base SQLite local.",
        summary: buildSummaryEntries({
          products: Number(products[0]?.c ?? 0),
          customers: Number(customers[0]?.c ?? 0),
          sales: Number(sales[0]?.c ?? 0),
          movements: Number(movements[0]?.c ?? 0),
          lastExportAt,
          lastRestoreAt
        })
      };
    }

    const [products, customers, sales, stock] = await Promise.all([
      appRepository.getProducts(),
      appRepository.getCustomers(),
      appRepository.getSales(),
      appRepository.getStockSnapshot()
    ]);

    return {
      mode: "demo",
      canRestore: false,
      lastExportAt,
      lastRestoreAt,
      helper: "Modo browser/demo exporta uma fotografia logica. Restauracao completa exige SQLite/Tauri.",
      summary: buildSummaryEntries({
        products: products.length,
        customers: customers.length,
        sales: sales.length,
        movements: stock.movements.length,
        lastExportAt,
        lastRestoreAt
      })
    };
  },

  async exportNow(): Promise<{ filename: string; exportedAt: string }> {
    const exportedAt = new Date().toISOString();
    const db = await getSqliteDatabase();

    const snapshot: BackupSnapshot = db
      ? {
          metadata: {
            appName: APP_NAME,
            version: APP_VERSION,
            exportedAt,
            mode: "sqlite",
            format: "smart-tech-backup-v1"
          },
          tables: await collectSqliteTables()
        }
      : {
          metadata: {
            appName: APP_NAME,
            version: APP_VERSION,
            exportedAt,
            mode: "demo",
            format: "smart-tech-backup-v1"
          },
          logical: await collectLogicalSnapshot()
        };

    const filename = buildFilename(exportedAt);
    downloadTextFile(filename, JSON.stringify(snapshot, null, 2));
    await setMetaValue(META_EXPORT_AT, exportedAt);

    return { filename, exportedAt };
  },

  async restoreFromText(rawContent: string): Promise<{ restoredAt: string; summary: string }> {
    let parsed: BackupSnapshot;

    try {
      parsed = JSON.parse(rawContent) as BackupSnapshot;
    } catch {
      throw new Error("Arquivo invalido. O backup precisa estar em JSON valido.");
    }

    if (parsed.metadata?.format !== "smart-tech-backup-v1") {
      throw new Error("Formato de backup nao reconhecido para este sistema.");
    }

    if (!isSqliteBackup(parsed)) {
      throw new Error("Este arquivo nao contem as tabelas completas para restauracao no SQLite.");
    }

    const db = await getSqliteDatabase();
    if (!db) {
      throw new Error("Restauração completa disponivel apenas no app desktop com SQLite.");
    }

    await db.execute("PRAGMA foreign_keys = OFF");
    await db.execute("BEGIN IMMEDIATE TRANSACTION");

    try {
      await clearAllTables();
      for (const table of TABLES_IN_EXPORT_ORDER) {
        await insertTableRows(table, parsed.tables[table] ?? []);
      }
      await db.execute("COMMIT");
      await db.execute("PRAGMA foreign_keys = ON");
    } catch (error) {
      await db.execute("ROLLBACK");
      await db.execute("PRAGMA foreign_keys = ON");
      throw error;
    }

    const restoredAt = new Date().toISOString();
    await setMetaValue(META_RESTORE_AT, restoredAt);

    const products = parsed.tables.products?.length ?? 0;
    const sales = parsed.tables.sales?.length ?? 0;
    const customers = parsed.tables.customers?.length ?? 0;

    return {
      restoredAt,
      summary: `Backup restaurado com ${products} produtos, ${sales} vendas e ${customers} clientes.`
    };
  }
};
