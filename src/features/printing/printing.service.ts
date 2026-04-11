import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Customer, Order, Product, Sale, SettingsSnapshot, StockSnapshot } from "@/types/domain";

export type PrintStatusTone = "ok" | "warning" | "pending";

export interface PrintTemplateItem {
  id: string;
  title: string;
  format: string;
  density: string;
  description: string;
  recommendedDevice: string;
  readiness: PrintStatusTone;
  helper: string;
  isPreferred?: boolean;
}

export interface PrinterDeviceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  role: string;
  helper: string;
  printFlowLabel: string;
  isDefault?: boolean;
}

export interface PrintJobItem {
  id: string;
  title: string;
  format: string;
  status: string;
  createdAt: string;
  helper: string;
}

export interface PrintReadinessItem {
  id: string;
  title: string;
  helper: string;
  status: PrintStatusTone;
}

export interface PrintPreviewSection {
  id: string;
  title: string;
  subtitle: string;
  lines: string[];
  totals?: Array<{ label: string; value: string }>;
  footer?: string;
  barcodeValue?: string;
}

export interface PrintCenterSnapshot {
  templates: PrintTemplateItem[];
  devices: PrinterDeviceItem[];
  jobs: PrintJobItem[];
  readiness: PrintReadinessItem[];
  previews: Record<string, PrintPreviewSection>;
}

export interface PrintPreviewOpenOptions {
  autoPrint?: boolean;
}

function withLabelTemplate(settings: SettingsSnapshot, template: "tpl-label" | "tpl-stock"): SettingsSnapshot {
  return {
    ...settings,
    defaultLabelTemplate: template
  };
}

export const SALE_PRINT_BEHAVIOR_OPTIONS = [
  { value: "disabled", label: "Não abrir automaticamente" },
  { value: "preview", label: "Abrir preview após venda" },
  { value: "auto", label: "Abrir impressão automaticamente (diálogo do Windows)" }
] as const;

export const SALE_PRINT_TEMPLATE_OPTIONS = [
  { value: "tpl-58", label: "Comprovante PDV · 58 mm" },
  { value: "tpl-80", label: "Cupom detalhado · 80 mm" }
] as const;

export const LABEL_PRINT_TEMPLATE_OPTIONS = [
  { value: "tpl-label", label: "Etiqueta de produto" },
  { value: "tpl-stock", label: "Reposição rápida · A4" }
] as const;

function normalizePrinterName(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function buildCompanyFooter(settings: SettingsSnapshot) {
  return [settings.document.trim(), settings.companyPhone.trim() || settings.companyWhatsapp.trim()].filter(Boolean).join(" • ");
}

function buildCompanyAddress(settings: SettingsSnapshot) {
  return [
    [settings.addressLine.trim(), settings.addressNumber.trim()].filter(Boolean).join(", "),
    settings.addressDistrict.trim(),
    [settings.addressCity.trim(), settings.addressState.trim()].filter(Boolean).join(" - ")
  ]
    .filter(Boolean)
    .join(" • ");
}

function getStatusFromName(name: string) {
  return name.toLowerCase().includes("não configurada") || name.toLowerCase().includes("nao configurada") ? "Configurar" : "Configurada";
}

function getReadinessStatus(ok: boolean): PrintStatusTone {
  return ok ? "ok" : "warning";
}

function getProductName(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)?.name ?? productId;
}

function getTemplateDevice(templateId: string, devices: PrinterDeviceItem[]) {
  if (templateId === "tpl-80") return devices.find((device) => device.id === "device-80");
  if (templateId === "tpl-label") return devices.find((device) => device.id === "device-label");
  if (templateId === "tpl-order" || templateId === "tpl-close" || templateId === "tpl-stock") {
    return devices.find((device) => device.id === "device-a4");
  }
  return devices.find((device) => device.id === "device-58");
}

function buildSalePreviewSection(input: {
  templateId: string;
  sale: Sale;
  products: Product[];
  settings: SettingsSnapshot;
  devices: PrinterDeviceItem[];
  customer?: Customer;
}): PrintPreviewSection {
  const { templateId, sale, products, settings, devices, customer } = input;
  const itemLines = sale.items.map((item) => {
    const productName = getProductName(products, item.productId);
    const lineTotal = item.quantity * item.unitPrice;
    return `${productName} ${item.size} x${item.quantity} · ${formatCurrency(lineTotal)}`;
  });
  const companyName = settings.companyName.trim() || "Smart Tech PDV";
  const companyFooter = buildCompanyFooter(settings);
  const companyAddress = buildCompanyAddress(settings);
  const paymentLabel = sale.paymentMethods.join(" / ");
  const customerLabel = customer?.name ?? "Consumidor final";
  const device = getTemplateDevice(templateId, devices);

  if (templateId === "tpl-80") {
    return {
      id: templateId,
      title: companyName,
      subtitle: "Cupom detalhado · 80 mm",
      lines: [
        ...(companyFooter ? [companyFooter] : []),
        ...(companyAddress ? [companyAddress] : []),
        `Venda: ${sale.id}`,
        `Cliente: ${customerLabel}`,
        `Pagamento: ${paymentLabel}`,
        `Horário: ${formatDate(sale.createdAt)}`,
        ...itemLines
      ],
      totals: [
        { label: "Subtotal", value: formatCurrency(sale.subtotal) },
        { label: "Desconto", value: formatCurrency(sale.discount) },
        { label: "Total", value: formatCurrency(sale.total) }
      ],
      footer: [companyFooter, `Saída recomendada: ${device?.name ?? "80 mm"}`].filter(Boolean).join(" • ")
    };
  }

  return {
    id: templateId,
    title: companyName,
    subtitle: "Comprovante PDV · 58 mm",
    lines: [
      ...(companyFooter ? [companyFooter] : []),
      `Venda: ${sale.id}`,
      `Cliente: ${customerLabel}`,
      `Itens: ${formatNumber(sale.items.length)} | Pgto: ${paymentLabel}`,
      ...itemLines
    ],
    totals: [
      { label: "Subtotal", value: formatCurrency(sale.subtotal) },
      { label: "Desconto", value: formatCurrency(sale.discount) },
      { label: "Total", value: formatCurrency(sale.total) }
    ],
    footer: [companyFooter, `Saída recomendada: ${device?.name ?? "58 mm"}`].filter(Boolean).join(" • ")
  };
}

export function buildPrintCenterSnapshot(input: {
  settings: SettingsSnapshot;
  products: Product[];
  sales: Sale[];
  orders: Order[];
  stockSnapshot: StockSnapshot;
}): PrintCenterSnapshot {
  const { settings, products, sales, orders, stockSnapshot } = input;

  const printer58 = normalizePrinterName(settings.thermalPrinter58, "POS-RAM BT 58mm");
  const printer80 = normalizePrinterName(settings.thermalPrinter80, "POS-RAM BT 80mm");
  const lowStockCount = stockSnapshot.alerts.length;
  const lastSale = sales[0];
  const topProduct = [...products].sort((left, right) => right.sales30d - left.sales30d)[0] ?? products[0];
  const lastOrder = orders[0];

  const devices: PrinterDeviceItem[] = [
    {
      id: "device-58",
      name: printer58,
      type: "58 mm",
      status: getStatusFromName(printer58),
      role: "Cupom rápido / comprovante",
      helper: "Abre o diálogo de impressão do Windows para o layout térmico rápido do caixa.",
      printFlowLabel: "Diálogo do Windows",
      isDefault: settings.defaultSalePrintTemplate === "tpl-58"
    },
    {
      id: "device-80",
      name: printer80,
      type: "80 mm",
      status: getStatusFromName(printer80),
      role: "Cupom detalhado / balcão",
      helper: "Abre o diálogo de impressão do Windows para o cupom detalhado do balcão.",
      printFlowLabel: "Diálogo do Windows",
      isDefault: settings.defaultSalePrintTemplate === "tpl-80"
    },
    {
      id: "device-label",
      name: "Etiquetadora local / preview",
      type: "Etiqueta",
      status: "Preview local",
      role: "Etiqueta de produto com código de barras",
      helper: "Gera a etiqueta localmente e pode seguir para impressão pelo diálogo do Windows.",
      printFlowLabel: "Preview + diálogo",
      isDefault: settings.defaultLabelTemplate === "tpl-label"
    },
    {
      id: "device-a4",
      name: "PDF / impressora A4 local",
      type: "A4",
      status: "Preview local",
      role: "Reposição e resumo operacional",
      helper: "Gera o layout A4 localmente e deixa a impressão sob controle do Windows.",
      printFlowLabel: "Preview + diálogo",
      isDefault: settings.defaultLabelTemplate === "tpl-stock"
    }
  ];

  const readiness: PrintReadinessItem[] = [
    {
      id: "ready-58",
      title: "Térmica 58 mm definida",
      helper: printer58,
      status: getReadinessStatus(Boolean(printer58.trim()))
    },
    {
      id: "ready-80",
      title: "Térmica 80 mm definida",
      helper: printer80,
      status: getReadinessStatus(Boolean(printer80.trim()))
    },
    {
      id: "ready-stock",
      title: "Térmicas prontas para o caixa",
      helper: `${formatNumber(lowStockCount)} alerta(s) de estoque seguem no sistema, sem depender de A4 no fluxo do balcão.`,
      status: lowStockCount <= 12 ? "ok" : "warning"
    },
    {
      id: "ready-offline",
      title: "Preview local pronto",
      helper: "A loja consegue montar o layout offline e mandar para o diálogo de impressão do Windows.",
      status: "ok"
    },
    {
      id: "ready-policy",
      title: "Padrão de impressão salvo",
      helper:
        settings.salePrintBehavior === "disabled"
          ? "Venda fecha sem abrir impressão automaticamente."
          : `PDV usa ${settings.defaultSalePrintTemplate === "tpl-80" ? "cupom 80 mm" : "comprovante 58 mm"} com política ${settings.salePrintBehavior === "auto" ? "de diálogo automático" : "preview"}.`,
      status: "ok"
    }
  ];

  const templates: PrintTemplateItem[] = [
    {
      id: "tpl-58",
      title: "Comprovante PDV",
      format: "58 mm",
      density: "Compacto",
      description: "Venda rápida, subtotal, desconto e forma de pagamento em layout enxuto.",
      recommendedDevice: printer58,
      readiness: readiness[0].status,
      helper: "Melhor para fluxo de caixa e atendimento no balcão.",
      isPreferred: settings.defaultSalePrintTemplate === "tpl-58"
    },
    {
      id: "tpl-80",
      title: "Cupom detalhado",
      format: "80 mm",
      density: "Detalhado",
      description: "Itens, vendedor, observacoes e leitura mais confortavel.",
      recommendedDevice: printer80,
      readiness: readiness[1].status,
      helper: "Quando o cliente precisa de mais detalhes no cupom.",
      isPreferred: settings.defaultSalePrintTemplate === "tpl-80"
    },
    {
      id: "tpl-label",
      title: "Etiqueta de produto",
      format: "Etiqueta",
      density: "SKU + código de barras",
      description: "Etiqueta individual para o item cadastrado, com nome, SKU, preco e leitura por barras.",
      recommendedDevice: "Etiquetadora local / preview",
      readiness: "ok",
      helper: "Ideal para cadastro, gôndola, prova e conferência rápida.",
      isPreferred: settings.defaultLabelTemplate === "tpl-label"
    },
    {
      id: "tpl-stock",
      title: "Reposição rápida",
      format: "A4",
      density: "Operacional",
      description: "Resumo de reposição com grade, saldo e preço para apoio da equipe.",
      recommendedDevice: "PDF / impressora A4 local",
      readiness: "ok",
      helper: "Melhor para conferência administrativa e apoio ao estoque.",
      isPreferred: settings.defaultLabelTemplate === "tpl-stock"
    }
  ];

  const jobs: PrintJobItem[] = [
    lastSale
      ? {
          id: `job-sale-${lastSale.id}`,
          title: "Cupom da última venda",
          format: settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm",
          status: settings.salePrintBehavior === "disabled" ? "Manual" : "Pronto para teste",
          createdAt: lastSale.createdAt,
          helper: `Venda local de ${formatCurrency(lastSale.total)} com ${lastSale.items.length} item(ns).`
        }
      : {
          id: "job-sale-empty",
          title: "Cupom de caixa",
          format: settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm",
          status: "Aguardando venda",
          createdAt: new Date().toISOString(),
          helper: "Assim que houver uma venda, o histórico de impressão entra aqui."
        },
    {
      id: "job-policy",
      title: "Política de impressão do PDV",
      format: settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm",
      status:
        settings.salePrintBehavior === "auto"
          ? "Impressao automatica"
          : settings.salePrintBehavior === "preview"
            ? "Preview apos venda"
            : "Manual",
      createdAt: new Date().toISOString(),
      helper: `Template padrão do caixa: ${settings.defaultSalePrintTemplate === "tpl-80" ? "Cupom detalhado 80 mm" : "Comprovante PDV 58 mm"}.`
    }
  ];

  const previews: Record<string, PrintPreviewSection> = {
    "tpl-58": {
      id: "tpl-58",
      title: "Smart Tech PDV",
      subtitle: "Comprovante PDV · 58 mm",
      lines: [
        `Cliente: ${lastSale?.customerId ? `Cliente ${lastSale.customerId}` : "Consumidor final"}`,
        `Itens: ${formatNumber(lastSale?.items.length ?? 0)} | Forma: ${(lastSale?.paymentMethods ?? ["Pix"]).join(" / ")}`,
        `Produto destaque: ${topProduct?.name ?? "Sem produto em foco"}`,
        `Horário: ${formatDate(lastSale?.createdAt ?? new Date().toISOString())}`
      ],
      totals: [
        { label: "Subtotal", value: formatCurrency(lastSale?.subtotal ?? 0) },
        { label: "Desconto", value: formatCurrency(lastSale?.discount ?? 0) },
        { label: "Total", value: formatCurrency(lastSale?.total ?? 0) }
      ],
      footer: `Impressora sugerida: ${printer58}`
    },
    "tpl-80": {
      id: "tpl-80",
      title: "Cupom detalhado",
      subtitle: "80 mm · atendimento no balcão",
      lines: [
        `Loja: ${topProduct ? "Moda e Calçados" : "Loja local"}`,
        `Venda mais recente: ${formatDate(lastSale?.createdAt ?? new Date().toISOString())}`,
        `Itens no cupom: ${formatNumber(lastSale?.items.length ?? 0)}`,
        `Top produto: ${topProduct?.name ?? "Sem dados"} · ${topProduct?.color ?? "cor pendente"}`
      ],
      totals: [
        { label: "Total", value: formatCurrency(lastSale?.total ?? 0) },
        { label: "Ticket médio", value: formatCurrency(lastSale?.total ?? 0) },
        { label: "Pagamento", value: (lastSale?.paymentMethods ?? ["Pix"]).join(" / ") }
      ],
      footer: `Impressora sugerida: ${printer80}`
    },
    "tpl-label": buildProductLabelPrintPreview({
      settings: withLabelTemplate(settings, "tpl-label"),
      product: topProduct
    }),
    "tpl-stock": buildProductLabelPrintPreview({
      settings: withLabelTemplate(settings, "tpl-stock"),
      product: topProduct
    })
  };

  return {
    templates,
    devices,
    jobs,
    readiness,
    previews
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildBarcodeMarkup(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const bars = digits
    .split("")
    .map((digit, index) => {
      const base = Number(digit);
      const widths = [
        1 + ((base + index) % 3),
        1 + ((base + 1) % 3),
        1 + ((base + 2 + index) % 3),
        1 + ((base + 1 + index) % 3)
      ];

      return widths
        .map((width, widthIndex) => `<span class="bar ${widthIndex % 2 === 0 ? "dark" : "light"} w-${width}"></span>`)
        .join("");
    })
    .join("");

  return `<div class="barcode-shell"><div class="barcode-visual">${bars}</div><div class="barcode-text">${escapeHtml(digits)}</div></div>`;
}

function buildLabelSheetMarkup(section: PrintPreviewSection) {
  const barcodeMarkup = section.barcodeValue ? buildBarcodeMarkup(section.barcodeValue) : "";
  const detailRows = section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const totalsMarkup = (section.totals ?? [])
    .map((row) => `<div class="label-total"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`)
    .join("");

  return `
    <div class="sheet label-sheet">
      <div class="label-brand">${escapeHtml(section.footer ?? "Smart Tech PDV")}</div>
      <div class="label-title">${escapeHtml(section.title)}</div>
      <div class="label-subtitle">${escapeHtml(section.subtitle)}</div>
      ${totalsMarkup ? `<div class="label-pricing">${totalsMarkup}</div>` : ""}
      ${barcodeMarkup}
      <div class="label-details">${detailRows}</div>
    </div>
  `;
}

export function openPrintPreview(section: PrintPreviewSection): boolean {
  return openPrintPreviewWithOptions(section);
}

export function openPrintDialog(section: PrintPreviewSection): boolean {
  return openPrintPreviewWithOptions(section, { autoPrint: true });
}

export function openPrintPreviewWithOptions(section: PrintPreviewSection, options: PrintPreviewOpenOptions = {}): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const popup = window.open("", "_blank", "width=420,height=700,noopener,noreferrer");
  if (!popup) {
    return false;
  }

  const totalsMarkup = (section.totals ?? [])
    .map((row) => `<div class=\"row total\"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`)
    .join("");

  const linesMarkup = section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const isLabelSheet = section.id === "tpl-label" || Boolean(section.barcodeValue);
  const contentMarkup = isLabelSheet
    ? buildLabelSheetMarkup(section)
    : `<div class="sheet">
      <h1>${escapeHtml(section.title)}</h1>
      <div class="subtitle">${escapeHtml(section.subtitle)}</div>
      <div class="block">${linesMarkup}</div>
      <div class="block">${totalsMarkup}</div>
      <div class="footer">${escapeHtml(section.footer ?? "Preview gerado pelo Smart Tech PDV")}</div>
    </div>`;

  popup.document.write(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(section.title)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; background: #fff; color: #111827; }
      .sheet { max-width: 360px; margin: 0 auto; border: 1px dashed #cbd5e1; padding: 20px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .subtitle { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; }
      .block { margin-top: 16px; }
      p { margin: 0 0 8px; font-size: 13px; line-height: 1.5; }
      .row { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; margin-bottom: 8px; }
      .total { border-top: 1px dashed #cbd5e1; padding-top: 8px; }
      .footer { margin-top: 18px; font-size: 12px; color: #475569; }
      .label-sheet { max-width: 420px; display: grid; gap: 10px; text-align: center; }
      .label-brand { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
      .label-title { font-size: 24px; font-weight: 800; line-height: 1.1; }
      .label-subtitle { font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
      .label-pricing { display: grid; gap: 6px; }
      .label-total { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 10px 12px; font-size: 13px; }
      .label-total strong { font-size: 26px; }
      .label-details { display: grid; gap: 6px; text-align: left; }
      .label-details p { font-size: 12px; margin: 0; }
      .barcode-shell { display: grid; gap: 6px; }
      .barcode-visual { display: flex; align-items: stretch; justify-content: center; gap: 1px; min-height: 84px; padding: 10px 0 2px; }
      .barcode-text { font-family: "Courier New", monospace; font-size: 14px; letter-spacing: .24em; text-align: center; }
      .bar { display: block; height: 100%; background: #0f172a; }
      .bar.light { opacity: 0; }
      .bar.w-1 { width: 1px; }
      .bar.w-2 { width: 2px; }
      .bar.w-3 { width: 3px; }
      @media print { body { padding: 0; } .sheet { border: 0; max-width: none; } }
    </style>
  </head>
  <body>
    ${contentMarkup}
    <script>
      window.focus();
      ${options.autoPrint ? "window.print();" : ""}
    </script>
  </body>
</html>`);
  popup.document.close();
  return true;
}

export function buildSalePrintPreview(input: {
  settings: SettingsSnapshot;
  products: Product[];
  sale: Sale;
  customers?: Customer[];
}): PrintPreviewSection {
  const stockSnapshot: StockSnapshot = {
    totalUnits: 0,
    lowStockCount: 0,
    inventoryValue: 0,
    stockCoverageDays: 0,
    movements: [],
    alerts: [],
    coverage: []
  };

  const devices = buildPrintCenterSnapshot({
    settings: input.settings,
    products: input.products,
    sales: [input.sale],
    orders: [],
    stockSnapshot
  }).devices;

  const customer = input.customers?.find((entry) => entry.id === input.sale.customerId);

  return buildSalePreviewSection({
    templateId: input.settings.defaultSalePrintTemplate,
    sale: input.sale,
    products: input.products,
    settings: input.settings,
    devices,
    customer
  });
}

export function buildSalePrintPreviewForTemplate(input: {
  templateId: string;
  settings: SettingsSnapshot;
  products: Product[];
  sale: Sale;
  customers?: Customer[];
}): PrintPreviewSection {
  const stockSnapshot: StockSnapshot = {
    totalUnits: 0,
    lowStockCount: 0,
    inventoryValue: 0,
    stockCoverageDays: 0,
    movements: [],
    alerts: [],
    coverage: []
  };

  const devices = buildPrintCenterSnapshot({
    settings: input.settings,
    products: input.products,
    sales: [input.sale],
    orders: [],
    stockSnapshot
  }).devices;

  const customer = input.customers?.find((entry) => entry.id === input.sale.customerId);

  return buildSalePreviewSection({
    templateId: input.templateId,
    sale: input.sale,
    products: input.products,
    settings: input.settings,
    devices,
    customer
  });
}

export function buildProductLabelPrintPreview(input: {
  settings: SettingsSnapshot;
  product: Product;
}): PrintPreviewSection {
  const { settings, product } = input;
  const totalUnits = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const pricingLabel = formatCurrency(product.promotionalPrice ?? product.salePrice);
  const companyName = settings.companyName.trim() || "Smart Tech PDV";
  const companyFooter = buildCompanyFooter(settings);

  if (settings.defaultLabelTemplate === "tpl-stock") {
    return {
      id: "tpl-stock",
      title: companyName,
      subtitle: "Reposição rápida · A4",
      lines: [
        `Produto: ${product.name}`,
        `Setor: ${product.sector === "calcados" ? "Calçados" : "Roupas"}`,
        `SKU: ${product.sku} | Interno: ${product.internalCode}`,
        `Cor: ${product.color} | Categoria: ${product.categoryId || "Não definida"}`,
        `Saldo atual: ${formatNumber(totalUnits)} unidade(s)`,
        `Grade: ${product.variants.map((variant) => `${variant.size}(${variant.stock})`).join(" · ")}`
      ],
      totals: [{ label: "Preço de venda", value: pricingLabel }],
      footer: [companyFooter, "Preview local de etiqueta para reposição e conferência."].filter(Boolean).join(" • ")
    };
  }

  return {
    id: "tpl-label",
    title: product.name,
    subtitle: "Etiqueta de produto",
    lines: [
      `SKU: ${product.sku}`,
      `Interno: ${product.internalCode || "Não informado"}`,
      `Código de barras: ${product.barcode || "Não informado"}`,
      `Setor: ${product.sector === "calcados" ? "Calçados" : "Roupas"} | Cor: ${product.color}`,
      `Saldo local: ${formatNumber(totalUnits)} unidade(s)`
    ],
    totals: [{ label: "Preço", value: pricingLabel }],
    footer: [companyName, companyFooter].filter(Boolean).join(" • "),
    barcodeValue: product.barcode
  };
}
