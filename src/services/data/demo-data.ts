import type {
  Brand,
  Category,
  Customer,
  DashboardSnapshot,
  DiagnosticsSnapshot,
  FinancialEntry,
  Order,
  Product,
  Purchase,
  ReportsSnapshot,
  Sale,
  SettingsSnapshot,
  StockMovement,
  StockSnapshot
} from "@/types/domain";
import { formatCurrency } from "@/lib/utils";
import { buildStockAlerts, buildStockCoverage } from "@/features/stock/stock.service";

export const categories: Category[] = [
  { id: "sneakers", name: "Tenis", share: 22, sector: "calcados" },
  { id: "casual", name: "Casual", share: 14, sector: "calcados" },
  { id: "bota", name: "Botas", share: 10, sector: "calcados" },
  { id: "sandalia", name: "Sandalias", share: 12, sector: "calcados" },
  { id: "social", name: "Social", share: 8, sector: "calcados" },
  { id: "blusas", name: "Blusas", share: 11, sector: "roupas" },
  { id: "jeans", name: "Jeans", share: 9, sector: "roupas" },
  { id: "vestidos", name: "Vestidos", share: 14, sector: "roupas" }
];

export const brands: Brand[] = [
  { id: "urban-step", name: "Urban Step", leadTimeDays: 7 },
  { id: "vento", name: "Vento", leadTimeDays: 10 },
  { id: "atelier-sole", name: "Atelier Sole", leadTimeDays: 14 },
  { id: "nord", name: "Nord", leadTimeDays: 12 },
  { id: "jaque-style", name: "Jaque Style", leadTimeDays: 9 },
  { id: "bella-trama", name: "Bella Trama", leadTimeDays: 11 }
];

export const products: Product[] = [
  {
    id: "p1",
    sector: "calcados",
    name: "Urban Motion Knit",
    sku: "STM-UMK-001",
    internalCode: "TEN-001",
    barcode: "7891001000011",
    brandId: "urban-step",
    categoryId: "sneakers",
    subcategory: "Running casual",
    gender: "Unissex",
    material: "Knit premium",
    color: "Azul marinho",
    costPrice: 129.9,
    salePrice: 249.9,
    promotionalPrice: 229.9,
    tags: ["Best-seller", "Conforto"],
    status: "active",
    imageHint: "tenis azul premium",
    sales30d: 48,
    variants: [
      { id: "p1-38", size: "38", stock: 4, reserved: 1 },
      { id: "p1-39", size: "39", stock: 6, reserved: 0 },
      { id: "p1-40", size: "40", stock: 8, reserved: 1 },
      { id: "p1-41", size: "41", stock: 7, reserved: 0 }
    ]
  },
  {
    id: "p2",
    sector: "calcados",
    name: "Vento Street Lite",
    sku: "STM-VSL-014",
    internalCode: "TEN-014",
    barcode: "7891001000012",
    brandId: "vento",
    categoryId: "sneakers",
    subcategory: "Streetwear",
    gender: "Masculino",
    material: "Sintetico fosco",
    color: "Branco gelo",
    costPrice: 139.5,
    salePrice: 279.9,
    tags: ["Lancamento"],
    status: "active",
    imageHint: "tenis branco clean",
    sales30d: 35,
    variants: [
      { id: "p2-39", size: "39", stock: 3, reserved: 1 },
      { id: "p2-40", size: "40", stock: 5, reserved: 0 },
      { id: "p2-41", size: "41", stock: 4, reserved: 0 },
      { id: "p2-42", size: "42", stock: 2, reserved: 0 }
    ]
  },
  {
    id: "p3",
    sector: "calcados",
    name: "Atelier Sole Firenze",
    sku: "STM-ASF-088",
    internalCode: "SOC-088",
    barcode: "7891001000013",
    brandId: "atelier-sole",
    categoryId: "social",
    subcategory: "Oxford",
    gender: "Masculino",
    material: "Couro legitimo",
    color: "Cafe",
    costPrice: 199.9,
    salePrice: 389.9,
    tags: ["Premium"],
    status: "active",
    imageHint: "sapato couro cafe",
    sales30d: 14,
    variants: [
      { id: "p3-39", size: "39", stock: 2, reserved: 0 },
      { id: "p3-40", size: "40", stock: 4, reserved: 0 },
      { id: "p3-41", size: "41", stock: 5, reserved: 1 },
      { id: "p3-42", size: "42", stock: 4, reserved: 0 }
    ]
  },
  {
    id: "p4",
    sector: "calcados",
    name: "Nord Terra Boot",
    sku: "STM-NTB-031",
    internalCode: "BOT-031",
    barcode: "7891001000014",
    brandId: "nord",
    categoryId: "bota",
    subcategory: "Adventure",
    gender: "Unissex",
    material: "Couro encerado",
    color: "Whisky",
    costPrice: 219.9,
    salePrice: 429.9,
    tags: ["Ticket alto"],
    status: "active",
    imageHint: "bota whisky couro",
    sales30d: 11,
    variants: [
      { id: "p4-37", size: "37", stock: 2, reserved: 0 },
      { id: "p4-38", size: "38", stock: 2, reserved: 0 },
      { id: "p4-39", size: "39", stock: 3, reserved: 0 },
      { id: "p4-40", size: "40", stock: 3, reserved: 0 }
    ]
  },
  {
    id: "p5",
    sector: "calcados",
    name: "Atelier Sole Siena",
    sku: "STM-ASS-107",
    internalCode: "SAN-107",
    barcode: "7891001000015",
    brandId: "atelier-sole",
    categoryId: "sandalia",
    subcategory: "Flat premium",
    gender: "Feminino",
    material: "Couro soft",
    color: "Off white",
    costPrice: 99.9,
    salePrice: 219.9,
    promotionalPrice: 199.9,
    tags: ["Giro rapido"],
    status: "active",
    imageHint: "sandalia elegante clara",
    sales30d: 27,
    variants: [
      { id: "p5-34", size: "34", stock: 7, reserved: 0 },
      { id: "p5-35", size: "35", stock: 5, reserved: 0 },
      { id: "p5-36", size: "36", stock: 5, reserved: 1 },
      { id: "p5-37", size: "37", stock: 4, reserved: 0 }
    ]
  },
  {
    id: "p6",
    sector: "calcados",
    name: "Urban Step Flow Slide",
    sku: "STM-UFS-064",
    internalCode: "CAS-064",
    barcode: "7891001000016",
    brandId: "urban-step",
    categoryId: "casual",
    subcategory: "Slip on",
    gender: "Unissex",
    material: "Neoprene flex",
    color: "Cinza lunar",
    costPrice: 89.5,
    salePrice: 179.9,
    tags: ["Conforto", "Reposicao"],
    status: "active",
    imageHint: "slip on cinza",
    sales30d: 31,
    variants: [
      { id: "p6-37", size: "37", stock: 9, reserved: 0 },
      { id: "p6-38", size: "38", stock: 8, reserved: 0 },
      { id: "p6-39", size: "39", stock: 6, reserved: 0 },
      { id: "p6-40", size: "40", stock: 5, reserved: 1 }
    ]
  },
  {
    id: "p9",
    sector: "roupas",
    name: "Blusa Soft Elegance",
    sku: "MOD-BLS-001",
    internalCode: "BLU-001",
    barcode: "7891002000011",
    brandId: "jaque-style",
    categoryId: "blusas",
    subcategory: "Manga longa",
    gender: "Feminino",
    material: "Viscolycra premium",
    color: "Rose",
    costPrice: 49.9,
    salePrice: 99.9,
    promotionalPrice: 89.9,
    tags: ["Moda", "Reposicao"],
    status: "active",
    imageHint: "blusa rose feminina",
    sales30d: 24,
    variants: [
      { id: "p9-p", size: "P", stock: 6, reserved: 0 },
      { id: "p9-m", size: "M", stock: 8, reserved: 1 },
      { id: "p9-g", size: "G", stock: 5, reserved: 0 },
      { id: "p9-gg", size: "GG", stock: 3, reserved: 0 }
    ]
  },
  {
    id: "p10",
    sector: "roupas",
    name: "Jeans Urban Fit",
    sku: "MOD-JEA-010",
    internalCode: "JEA-010",
    barcode: "7891002000012",
    brandId: "bella-trama",
    categoryId: "jeans",
    subcategory: "Calca reta",
    gender: "Feminino",
    material: "Jeans com elastano",
    color: "Azul medio",
    costPrice: 79.9,
    salePrice: 159.9,
    tags: ["Jeans", "Ticket medio"],
    status: "active",
    imageHint: "calca jeans azul",
    sales30d: 19,
    variants: [
      { id: "p10-p", size: "P", stock: 4, reserved: 0 },
      { id: "p10-m", size: "M", stock: 7, reserved: 0 },
      { id: "p10-g", size: "G", stock: 6, reserved: 1 },
      { id: "p10-gg", size: "GG", stock: 2, reserved: 0 }
    ]
  },
  {
    id: "p11",
    sector: "roupas",
    name: "Vestido Aura Midi",
    sku: "MOD-VES-021",
    internalCode: "VES-021",
    barcode: "7891002000013",
    brandId: "jaque-style",
    categoryId: "vestidos",
    subcategory: "Midi casual",
    gender: "Feminino",
    material: "Crepe leve",
    color: "Verde esmeralda",
    costPrice: 89.9,
    salePrice: 189.9,
    promotionalPrice: 169.9,
    tags: ["Vestido", "Vitrine"],
    status: "active",
    imageHint: "vestido midi verde",
    sales30d: 22,
    variants: [
      { id: "p11-p", size: "P", stock: 3, reserved: 0 },
      { id: "p11-m", size: "M", stock: 5, reserved: 0 },
      { id: "p11-g", size: "G", stock: 4, reserved: 1 },
      { id: "p11-gg", size: "GG", stock: 2, reserved: 0 }
    ]
  },
  {
    id: "p12",
    sector: "roupas",
    name: "Vestido Festa Lumiere",
    sku: "MOD-VES-045",
    internalCode: "VES-045",
    barcode: "7891002000014",
    brandId: "bella-trama",
    categoryId: "vestidos",
    subcategory: "Longo festa",
    gender: "Feminino",
    material: "Chiffon premium",
    color: "Preto",
    costPrice: 129.9,
    salePrice: 269.9,
    tags: ["Premium", "Festa"],
    status: "active",
    imageHint: "vestido longo preto",
    sales30d: 10,
    variants: [
      { id: "p12-p", size: "P", stock: 2, reserved: 0 },
      { id: "p12-m", size: "M", stock: 3, reserved: 0 },
      { id: "p12-g", size: "G", stock: 2, reserved: 0 },
      { id: "p12-gg", size: "GG", stock: 1, reserved: 0 }
    ]
  }
];

export const customers: Customer[] = [

  {
    id: "c1",
    name: "Marina Queiroz",
    phone: "(11) 99444-2201",
    whatsapp: "(11) 99444-2201",
    email: "marina@exemplo.com",
    lastPurchaseAt: "2026-04-02T18:22:00.000Z",
    averageTicket: 284.3,
    lifetimeValue: 4264.9,
    notes: "Prefere novidades femininas e contato por WhatsApp."
  },
  {
    id: "c2",
    name: "Rafael Nunes",
    phone: "(11) 98111-1414",
    whatsapp: "(11) 98111-1414",
    email: "rafael@exemplo.com",
    lastPurchaseAt: "2026-04-03T12:10:00.000Z",
    averageTicket: 312.8,
    lifetimeValue: 2815.2,
    notes: "Compra para trabalho e costuma levar 2 pares."
  },
  {
    id: "c3",
    name: "Beatriz Ferraz",
    phone: "(11) 99772-8844",
    whatsapp: "(11) 99772-8844",
    email: "bia@exemplo.com",
    lastPurchaseAt: "2026-03-30T15:35:00.000Z",
    averageTicket: 198.9,
    lifetimeValue: 1591.2,
    notes: "Cliente de campanha sazonal."
  },
  {
    id: "c4",
    name: "Carlos Mendes",
    phone: "(11) 98822-4400",
    whatsapp: "(11) 98822-4400",
    email: "carlos@exemplo.com",
    lastPurchaseAt: "2026-03-28T11:00:00.000Z",
    averageTicket: 418.4,
    lifetimeValue: 3899.0,
    notes: "Atendimento rapido no balcão."
  },
  {
    id: "c5",
    name: "Paula Siqueira",
    phone: "(11) 99555-7770",
    whatsapp: "(11) 99555-7770",
    email: "paula@exemplo.com",
    lastPurchaseAt: "2026-04-01T16:08:00.000Z",
    averageTicket: 255.7,
    lifetimeValue: 2140.8,
    notes: "Tem interesse em relatorio de fidelidade."
  }
];

export const suppliers = [
  {
    id: "s1",
    name: "Urban Step Distribuicao",
    cnpj: "44.222.111/0001-10",
    contact: "Renata Sales",
    email: "renata@urbanstep.com",
    leadTimeDays: 7,
    linkedProducts: 2
  },
  {
    id: "s2",
    name: "Atelier Sole Brasil",
    cnpj: "10.300.500/0001-20",
    contact: "Paulo Vinicius",
    email: "paulo@ateliersole.com",
    leadTimeDays: 14,
    linkedProducts: 2
  },
  {
    id: "s3",
    name: "Nord Footwear",
    cnpj: "08.777.444/0001-39",
    contact: "Lia Souto",
    email: "lia@nord.com",
    leadTimeDays: 12,
    linkedProducts: 2
  }
];

export const sales: Sale[] = [
  {
    id: "v1",
    customerId: "c2",
    total: 429.8,
    subtotal: 459.8,
    discount: 30,
    paymentMethods: ["Pix"],
    createdAt: "2026-04-03T12:10:00.000Z",
    items: [
      { productId: "p2", size: "40", quantity: 1, unitPrice: 279.9 },
      { productId: "p6", size: "39", quantity: 1, unitPrice: 179.9 }
    ]
  },
  {
    id: "v2",
    customerId: "c1",
    total: 199.9,
    subtotal: 219.9,
    discount: 20,
    paymentMethods: ["Cartao"],
    createdAt: "2026-04-02T18:22:00.000Z",
    items: [{ productId: "p5", size: "36", quantity: 1, unitPrice: 219.9 }]
  },
  {
    id: "v3",
    customerId: "c4",
    total: 389.9,
    subtotal: 389.9,
    discount: 0,
    paymentMethods: ["Dinheiro"],
    createdAt: "2026-04-02T10:30:00.000Z",
    items: [{ productId: "p3", size: "40", quantity: 1, unitPrice: 389.9 }]
  },
  {
    id: "v4",
    total: 249.9,
    subtotal: 249.9,
    discount: 0,
    paymentMethods: ["Pix"],
    createdAt: "2026-04-01T17:15:00.000Z",
    items: [{ productId: "p1", size: "39", quantity: 1, unitPrice: 249.9 }]
  }
];

export const orders: Order[] = [
  {
    id: "PED-24031",
    customerId: "c1",
    status: "em separacao",
    value: 599.8,
    createdAt: "2026-04-03T11:05:00.000Z",
    updatedAt: "2026-04-03T11:25:00.000Z",
    items: 2
  },
  {
    id: "PED-24030",
    customerId: "c2",
    status: "pronto",
    value: 279.9,
    createdAt: "2026-04-03T09:20:00.000Z",
    updatedAt: "2026-04-03T10:00:00.000Z",
    items: 1
  },
  {
    id: "PED-24028",
    customerId: "c5",
    status: "entregue",
    value: 429.9,
    createdAt: "2026-04-02T14:12:00.000Z",
    updatedAt: "2026-04-02T17:40:00.000Z",
    items: 1
  },
  {
    id: "PED-24027",
    customerId: "c4",
    status: "novo",
    value: 199.9,
    createdAt: "2026-04-02T09:15:00.000Z",
    updatedAt: "2026-04-02T09:15:00.000Z",
    items: 1
  }
];

export const purchases: Purchase[] = [
  {
    id: "COMP-8801",
    supplierId: "s1",
    status: "recebida",
    total: 4290,
    receivedAt: "2026-04-01T15:00:00.000Z",
    createdAt: "2026-03-27T10:00:00.000Z",
    items: 32
  },
  {
    id: "COMP-8802",
    supplierId: "s2",
    status: "conferida",
    total: 3180,
    receivedAt: "2026-04-02T12:00:00.000Z",
    createdAt: "2026-03-29T08:40:00.000Z",
    items: 18
  },
  {
    id: "COMP-8803",
    supplierId: "s3",
    status: "aberta",
    total: 5160,
    createdAt: "2026-04-03T08:15:00.000Z",
    items: 25
  }
];

export const stockMovements: StockMovement[] = [
  { id: "m1", productId: "p1", type: "saida", quantity: 1, createdAt: "2026-04-03T12:12:00.000Z", reason: "Venda PDV" },
  { id: "m2", productId: "p2", type: "saida", quantity: 1, createdAt: "2026-04-03T12:12:00.000Z", reason: "Venda PDV" },
  { id: "m3", productId: "p3", type: "entrada", quantity: 8, createdAt: "2026-04-02T11:00:00.000Z", reason: "Compra COMP-8802" },
  { id: "m4", productId: "p4", type: "ajuste", quantity: -1, createdAt: "2026-04-02T17:20:00.000Z", reason: "Avaria" },
  { id: "m5", productId: "p5", type: "saida", quantity: 1, createdAt: "2026-04-02T18:22:00.000Z", reason: "Venda PDV" },
  { id: "m6", productId: "p6", type: "inventario", quantity: 2, createdAt: "2026-04-01T09:00:00.000Z", reason: "Contagem cega" },
  { id: "m7", productId: "p7", type: "entrada", quantity: 6, createdAt: "2026-03-31T14:00:00.000Z", reason: "Reposicao Nord" },
  { id: "m8", productId: "p8", type: "ajuste", quantity: -2, createdAt: "2026-03-30T16:50:00.000Z", reason: "Baixa sazonal" }
];

export const financialEntries: FinancialEntry[] = [
  { id: "f1", type: "receber", description: "Cartao - adquirente", amount: 2180, status: "aberto", dueAt: "2026-04-05T12:00:00.000Z" },
  { id: "f2", type: "pagar", description: "Fornecedor Urban Step", amount: 4290, status: "pago", dueAt: "2026-04-03T12:00:00.000Z" },
  { id: "f3", type: "pagar", description: "Aluguel loja", amount: 3800, status: "aberto", dueAt: "2026-04-10T12:00:00.000Z" },
  { id: "f4", type: "receber", description: "Crediario Paula Siqueira", amount: 320, status: "atrasado", dueAt: "2026-03-28T12:00:00.000Z" },
  { id: "f5", type: "receber", description: "Pix consolidado", amount: 1845, status: "pago", dueAt: "2026-04-03T12:00:00.000Z" }
];

const dailySales = [8420, 9580, 10120, 11240, 10580, 13210, 14890];
const salesLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

export const dashboardSnapshot: DashboardSnapshot = {
  metrics: [
    { id: "m1", label: "Faturamento do dia", value: formatCurrency(4019.5), helper: "+12,4% vs ontem", trend: "up" },
    { id: "m2", label: "Vendas da semana", value: formatCurrency(78040), helper: "298 cupons emitidos", trend: "up" },
    { id: "m3", label: "Ticket medio", value: formatCurrency(261.2), helper: "Operacao rapida no balcão", trend: "up" },
    { id: "m4", label: "Estoque critico", value: "7 SKUs", helper: "Moda e calcados em alerta de reposicao", trend: "down" }
  ],
  salesSeries: salesLabels.map((label, index) => ({ label, value: dailySales[index] })),
  categorySeries: categories.map((category) => ({ label: category.name, value: category.share })),
  lowStockProducts: products.filter((product) => product.variants.reduce((acc, variant) => acc + variant.stock, 0) <= 10),
  topProducts: [...products].sort((a, b) => b.sales30d - a.sales30d).slice(0, 4),
  recentOrders: orders,
  recentCustomers: customers.slice(0, 4),
  quickActions: [
    { id: "qa1", label: "Nova venda", description: "Abre PDV com foco no teclado", path: "/pdv" },
    { id: "qa2", label: "Novo produto", description: "Cadastro rapido com grade", path: "/produtos" },
    { id: "qa3", label: "Entrada de estoque", description: "Lancamento por lote e fornecedor", path: "/estoque" },
    { id: "qa4", label: "Ver relatorios", description: "Fechamento financeiro e produtos", path: "/relatorios" }
  ],
  focusCards: [
    { id: "f1", title: "Reposicao imediata", description: "2 produtos precisam compra antes do proximo pico de vendas.", tone: "warning", actionLabel: "Ir ao estoque", actionPath: "/estoque" },
    { id: "f2", title: "Cadastro em destaque", description: "Sandalias femininas seguem com melhor giro promocional.", tone: "success", actionLabel: "Abrir produtos", actionPath: "/produtos" },
    { id: "f3", title: "Atendimento rapido", description: "PDV pronto para nova venda com fluxo curto e foco em teclado.", tone: "default", actionLabel: "Ir ao PDV", actionPath: "/pdv" }
  ]
};

export const stockSnapshot: StockSnapshot = {
  totalUnits: products.flatMap((product) => product.variants).reduce((acc, variant) => acc + variant.stock, 0),
  lowStockCount: dashboardSnapshot.lowStockProducts.length,
  inventoryValue: products.reduce(
    (acc, product) => acc + product.variants.reduce((sum, variant) => sum + variant.stock * product.costPrice, 0),
    0
  ),
  stockCoverageDays: 22,
  movements: stockMovements,
  alerts: buildStockAlerts(products),
  coverage: buildStockCoverage(products)
};

export const reportsSnapshot: ReportsSnapshot = {
  salesByChannel: [
    { label: "PDV", value: 62 },
    { label: "Pedido", value: 23 },
    { label: "WhatsApp", value: 15 }
  ],
  dormantProducts: products.filter((product) => product.sales30d < 10),
  bestCustomers: [...customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 4),
  financialBalance: [
    { label: "Receber", value: 4345 },
    { label: "Pagar", value: 8090 },
    { label: "Caixa", value: 12640 }
  ]
};

export const settingsSnapshot: SettingsSnapshot = {
  companyName: "Smart Tech Moda e Calcados",
  document: "12.345.678/0001-00",
  theme: "Windows Contrast",
  thermalPrinter58: "EPSON TM-T20 58mm",
  thermalPrinter80: "ELGIN Flash 80mm",
  defaultSalePrintTemplate: "tpl-58",
  defaultLabelTemplate: "tpl-label",
  salePrintBehavior: "preview",
  autoBackup: "Diario as 22:00",
  updaterChannel: "stable"
};

export const diagnosticsSnapshot: DiagnosticsSnapshot = {
  databaseStatus: "SQLite operacional e pronto para seed inicial",
  updaterStatus: "Configurado para release GitHub com latest.json",
  lastBackupAt: "2026-04-02T22:00:00.000Z",
  environment: "DESKTOP_READY",
  logs: [
    "[INFO] Shell inicializado com layout premium.",
    "[INFO] Repositorio mock habilitado para DEV e demo local.",
    "[INFO] Updater preparado para conferir novas versoes no GitHub Releases.",
    "[WARN] Instalar dependencias antes de rodar type-check e build reais."
  ]
};
