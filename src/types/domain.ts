export type Trend = "up" | "down" | "neutral";
export type EntityStatus = "active" | "inactive";
export type OrderStatus = "novo" | "em separacao" | "pronto" | "entregue" | "cancelado";
export type PaymentMethod = "Dinheiro" | "Pix" | "Cartao" | "Crediario";
export type ProductSector = "calcados" | "roupas";
export type OperationFocus = "geral" | ProductSector;

export interface NavItem {
  label: string;
  path: string;
  group: string;
  icon: unknown;
  badge?: string;
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
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  lastPurchaseAt: string;
  averageTicket: number;
  lifetimeValue: number;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
  email: string;
  leadTimeDays: number;
  linkedProducts: number;
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
  status: "aberta" | "conferida" | "recebida";
  total: number;
  receivedAt?: string;
  createdAt: string;
  items: number;
}

export interface FinancialEntry {
  id: string;
  type: "receber" | "pagar";
  description: string;
  amount: number;
  status: "aberto" | "pago" | "atrasado";
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
  theme: string;
  thermalPrinter58: string;
  thermalPrinter80: string;
  defaultSalePrintTemplate: string;
  defaultLabelTemplate: string;
  salePrintBehavior: string;
  autoBackup: string;
  updaterChannel: string;
}

export interface DiagnosticsSnapshot {
  databaseStatus: string;
  updaterStatus: string;
  lastBackupAt: string;
  environment: string;
  logs: string[];
}

export interface UpdateCheckState {
  status: "idle" | "checking" | "available" | "latest" | "error";
  version?: string;
  message: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  size: string;
  unitPrice: number;
}
