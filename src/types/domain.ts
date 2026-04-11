export type Trend = "up" | "down" | "neutral";
export type EntityStatus = "active" | "inactive";
export type OrderStatus = "novo" | "em separacao" | "pronto" | "entregue" | "cancelado";
export type PaymentMethod = "Dinheiro" | "Pix" | "Cartao" | "Crediario";
export type ProductSector = "calcados" | "roupas";
export type OperationFocus = "geral" | ProductSector;
export type UserRole = "operador" | "admin" | "super_admin";
export type LocalUserPermissionMode = "role" | "custom";
export type AppActionKey =
  | "catalog_manage"
  | "catalog_view_cost"
  | "stock_manage"
  | "stock_inventory"
  | "pdv_discount"
  | "print_labels"
  | "user_switch"
  | "user_manage";

export interface NavItem {
  label: string;
  path: string;
  group: string;
  icon: unknown;
  badge?: string;
  minRole?: UserRole;
}

export interface LocalUserProfile {
  id: string;
  name: string;
  role: UserRole;
  pin?: string;
  status: "active" | "inactive";
  permissionMode: LocalUserPermissionMode;
  allowedNavPaths: string[];
  allowedActions: AppActionKey[];
}

export interface Category {
  id: string;
  name: string;
  share: number;
  sector: ProductSector;
}

export interface Brand {
  id: string;
  name: string;
  leadTimeDays: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  reserved: number;
}

export interface Product {
  id: string;
  sector: ProductSector;
  name: string;
  sku: string;
  internalCode: string;
  barcode: string;
  brandId: string;
  categoryId: string;
  subcategory: string;
  gender: string;
  material: string;
  color: string;
  costPrice: number;
  salePrice: number;
  promotionalPrice?: number;
  tags: string[];
  status: EntityStatus;
  imageHint: string;
  imageDataUrl?: string;
  variants: ProductVariant[];
  sales30d: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: "entrada" | "saida" | "ajuste" | "inventario";
  quantity: number;
  createdAt: string;
  reason: string;
  size?: string;
}

export interface StockMovementDraft {
  productId: string;
  type: "entrada" | "saida" | "ajuste" | "inventario";
  quantity: number;
  reason: string;
  size: string;
}

export interface Customer {
  id: string;
  status: EntityStatus;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  lastPurchaseAt: string;
  averageTicket: number;
  lifetimeValue: number;
  notes: string;
}

export interface CustomerFormValues {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  notes: string;
}

export interface Supplier {
  id: string;
  status: EntityStatus;
  name: string;
  cnpj: string;
  contact: string;
  email: string;
  leadTimeDays: number;
  linkedProducts: number;
}

export interface SupplierFormValues {
  name: string;
  cnpj: string;
  contact: string;
  email: string;
  leadTimeDays: number;
}

export interface SaleItem {
  productId: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethods: PaymentMethod[];
  createdAt: string;
  items: SaleItem[];
}

export interface SaleDraft {
  customerId?: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethods: PaymentMethod[];
  items: CartItem[];
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  value: number;
  createdAt: string;
  updatedAt: string;
  items: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  productId?: string;
  status: "aberta" | "conferida" | "recebida";
  total: number;
  receivedAt?: string;
  createdAt: string;
  items: number;
  quantity?: number;
  unitCost?: number;
  lines?: PurchaseLine[];
}

export interface PurchaseLine {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  size?: string;
}

export interface PurchaseSizeBreakdownItem {
  size: string;
  quantity: number;
}

export interface PurchaseCreateInput {
  supplierId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  status?: Purchase["status"];
  sizeBreakdown?: PurchaseSizeBreakdownItem[];
}

export interface PurchaseReceiptInput {
  purchaseId: string;
  reason: string;
  lines: Array<{
    productId: string;
    size: string;
    quantity: number;
  }>;
}

export interface FinancialEntry {
  id: string;
  type: "receber" | "pagar";
  description: string;
  amount: number;
  status: "aberto" | "pago" | "atrasado";
  dueAt: string;
}

export interface FinancialEntryUpdateInput {
  status?: FinancialEntry["status"];
  dueAt?: string;
}

export interface FinancialEntryCreateInput {
  type: FinancialEntry["type"];
  description: string;
  amount: number;
  status?: FinancialEntry["status"];
  dueAt: string;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: Trend;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  path: string;
}

export interface DashboardFocusCard {
  id: string;
  title: string;
  description: string;
  tone: "default" | "warning" | "success";
  actionLabel: string;
  actionPath: string;
}

export interface ProductFilters {
  search: string;
  sector: OperationFocus;
  categoryId: string | null;
  brandId: string | null;
  status: EntityStatus | "all";
  gender: string | "all";
  size: string | null;
  lowStockOnly: boolean;
  promoOnly: boolean;
}

export interface ProductCatalogSummary {
  totalProducts: number;
  activeProducts: number;
  promotionalProducts: number;
  lowStockProducts: number;
  averageMargin: number;
  totalUnits: number;
}

export interface ProductFormValues {
  sector: ProductSector;
  name: string;
  sku: string;
  internalCode: string;
  barcode: string;
  brandId: string;
  categoryId: string;
  subcategory: string;
  gender: string;
  material: string;
  color: string;
  costPrice: number;
  salePrice: number;
  promotionalPrice?: number;
  tags: string[];
  status: EntityStatus;
  imageHint: string;
  imageDataUrl?: string;
  sizes: Array<{ size: string; stock: number }>;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  reason: string;
  severity: "high" | "medium";
  unitsAvailable: number;
  recommendedUnits: number;
}

export interface StockCoverageItem {
  id: string;
  productName: string;
  dailyVelocity: number;
  coverageDays: number;
  category: string;
}

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  salesSeries: ChartPoint[];
  categorySeries: ChartPoint[];
  lowStockProducts: Product[];
  topProducts: Product[];
  recentOrders: Order[];
  recentCustomers: Customer[];
  quickActions: QuickAction[];
  focusCards: DashboardFocusCard[];
}

export interface StockSnapshot {
  totalUnits: number;
  lowStockCount: number;
  inventoryValue: number;
  stockCoverageDays: number;
  movements: StockMovement[];
  alerts: StockAlert[];
  coverage: StockCoverageItem[];
}

export interface ReportsSnapshot {
  salesByChannel: Array<{ label: string; value: number }>;
  dormantProducts: Product[];
  bestCustomers: Customer[];
  financialBalance: Array<{ label: string; value: number }>;
}

export interface SettingsSnapshot {
  companyName: string;
  document: string;
  legalName: string;
  stateRegistration: string;
  companyPhone: string;
  companyWhatsapp: string;
  companyEmail: string;
  addressLine: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  theme: string;
  activeLocalUserId: string;
  localUsers: LocalUserProfile[];
  currentUserName: string;
  currentUserRole: UserRole;
  notifyUpdates: string;
  notifyLowStock: string;
  notifyOrders: string;
  notifyFinance: string;
  notifySync: string;
  thermalPrinter58: string;
  thermalPrinter80: string;
  defaultSalePrintTemplate: string;
  defaultLabelTemplate: string;
  salePrintBehavior: string;
  autoBackup: string;
  updaterChannel: string;
}

export type DiagnosticsRuntimeSeverity = "error" | "warning" | "info";
export type DiagnosticsRuntimeSource = "console" | "window" | "promise" | "router" | "data" | "manual";
export type DiagnosticsRuntimeModule =
  | "Painel"
  | "Produtos"
  | "Estoque"
  | "PDV"
  | "Pedidos"
  | "Clientes"
  | "Fornecedores"
  | "Compras"
  | "Relatórios"
  | "Financeiro"
  | "Configurações"
  | "Licença e sincronização"
  | "Backup"
  | "Impressão"
  | "Atualizações"
  | "Diagnóstico"
  | "Geral";

export interface DiagnosticsRuntimeEntry {
  id: string;
  severity: DiagnosticsRuntimeSeverity;
  source: DiagnosticsRuntimeSource;
  module: DiagnosticsRuntimeModule;
  title: string;
  message: string;
  detail?: string;
  routePath: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  fingerprint: string;
}

export interface DiagnosticsRuntimeSummary {
  totalEvents: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  lastRecordedAt: string | null;
  sources: DiagnosticsRuntimeSource[];
}

export interface DiagnosticsRuntimeSnapshot {
  summary: DiagnosticsRuntimeSummary;
  events: DiagnosticsRuntimeEntry[];
}

export interface DiagnosticsSnapshot {
  databaseStatus: string;
  updaterStatus: string;
  lastBackupAt: string;
  environment: string;
  logs: string[];
  runtime: DiagnosticsRuntimeSnapshot;
}

export type StressTestPreset = "small" | "medium" | "large";

export interface StressTestLoadResult {
  preset: StressTestPreset;
  customersCreated: number;
  productsCreated: number;
  salesCreated: number;
  ordersCreated: number;
  purchasesCreated: number;
  financialEntriesCreated: number;
  stockMovementsCreated: number;
  summary: string;
}

export interface UpdateCheckState {
  status: "idle" | "checking" | "available" | "latest" | "installing" | "installed" | "error";
  version?: string;
  message: string;
  details?: string;
  checkedAt?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  size: string;
  unitPrice: number;
}
