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

export const SALE_PRINT_BEHAVIOR_OPTIONS = [
  { value: "disabled", label: "Nao abrir automaticamente" },
  { value: "preview", label: "Abrir preview apos venda" },
  { value: "auto", label: "Abrir preview e chamar impressao" }
] as const;

export const SALE_PRINT_TEMPLATE_OPTIONS = [
  { value: "tpl-58", label: "Comprovante PDV · 58 mm" },
  { value: "tpl-80", label: "Cupom detalhado · 80 mm" }
] as const;

export const LABEL_PRINT_TEMPLATE_OPTIONS = [
  { value: "tpl-label", label: "Etiqueta de produto" },
  { value: "tpl-stock", label: "Reposicao rapida · A4" }
] as const;

function normalizePrinterName(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getStatusFromName(name: string) {
  return name.toLowerCase().includes("nao configurada") ? "Configurar" : "Pronta";
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
  const paymentLabel = sale.paymentMethods.join(" / ");
  const customerLabel = customer?.name ?? "Consumidor final";
  const device = getTemplateDevice(templateId, devices);

  if (templateId === "tpl-80") {
    return {
      id: templateId,
      title: companyName,
      subtitle: "Cupom detalhado · 80 mm",
      lines: [
        `Venda: ${sale.id}`,
        `Cliente: ${customerLabel}`,
        `Pagamento: ${paymentLabel}`,
        `Horario: ${formatDate(sale.createdAt)}`,
        ...itemLines
      ],
      totals: [
        { label: "Subtotal", value: formatCurrency(sale.subtotal) },
        { label: "Desconto", value: formatCurrency(sale.discount) },
        { label: "Total", value: formatCurrency(sale.total) }
      ],
      footer: `Saida recomendada: ${device?.name ?? "80 mm"}`
    };
  }

  return {
    id: templateId,
    title: companyName,
    subtitle: "Comprovante PDV · 58 mm",
    lines: [
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
    footer: `Saida recomendada: ${device?.name ?? "58 mm"}`
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

  const printer58 = normalizePrinterName(settings.thermalPrinter58, "Nao configurada - 58 mm");
  const printer80 = normalizePrinterName(settings.thermalPrinter80, "Nao configurada - 80 mm");
  const a4Printer = "Microsoft Print to PDF / A4";
  const labelPrinter = printer58.includes("Nao configurada") ? "Etiqueta via 58 mm" : `${printer58} · etiquetas`;

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
      role: "Cupom rapido / comprovante",
      helper: "Usar no caixa e em teste rapido de venda.",
      isDefault: settings.defaultSalePrintTemplate === "tpl-58"
    },
    {
      id: "device-80",
      name: printer80,
      type: "80 mm",
      status: getStatusFromName(printer80),
      role: "Cupom detalhado / balcão",
      helper: "Melhor para item completo, vendedor e observacoes.",
      isDefault: settings.defaultSalePrintTemplate === "tpl-80"
    },
    {
      id: "device-a4",
      name: a4Printer,
      type: "A4",
      status: "Pronta",
      role: "Separacao / administrativo",
      helper: "Ideal para conferencia, fechamento e pedido interno."
    },
    {
      id: "device-label",
      name: labelPrinter,
      type: "Etiqueta",
      status: printer58.includes("Nao configurada") ? "Ajustar" : "Pronta",
      role: "Preco / SKU / grade",
      helper: "Operacao de moda com etiqueta simples e veloz.",
      isDefault: settings.defaultLabelTemplate === "tpl-label"
    }
  ];

  const readiness: PrintReadinessItem[] = [
    {
      id: "ready-58",
      title: "Termica 58 mm definida",
      helper: printer58,
      status: getReadinessStatus(!printer58.includes("Nao configurada"))
    },
    {
      id: "ready-80",
      title: "Termica 80 mm definida",
      helper: printer80,
      status: getReadinessStatus(!printer80.includes("Nao configurada"))
    },
    {
      id: "ready-stock",
      title: "Etiqueta e estoque alinhados",
      helper: `${formatNumber(lowStockCount)} alertas de reposicao em leitura rapida para impressao interna.`,
      status: lowStockCount <= 12 ? "ok" : "warning"
    },
    {
      id: "ready-offline",
      title: "Preview local pronto",
      helper: "A loja consegue testar layout e imprimir mesmo operando offline.",
      status: "ok"
    },
    {
      id: "ready-policy",
      title: "Padrao de impressao salvo",
      helper:
        settings.salePrintBehavior === "disabled"
          ? "Venda fecha sem abrir impressao automaticamente."
          : `PDV usa ${settings.defaultSalePrintTemplate === "tpl-80" ? "cupom 80 mm" : "comprovante 58 mm"} com politica ${settings.salePrintBehavior === "auto" ? "automatica" : "preview"}.`,
      status: "ok"
    }
  ];

  const templates: PrintTemplateItem[] = [
    {
      id: "tpl-58",
      title: "Comprovante PDV",
      format: "58 mm",
      density: "Compacto",
      description: "Venda rapida, subtotal, desconto e forma de pagamento em layout enxuto.",
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
      density: "Varejo",
      description: "SKU, preco, setor e grade para moda e calcados.",
      recommendedDevice: labelPrinter,
      readiness: !printer58.includes("Nao configurada") ? "ok" : "warning",
      helper: "Rapido para reposicao e organizacao de arara/prateleira.",
      isPreferred: settings.defaultLabelTemplate === "tpl-label"
    },
    {
      id: "tpl-order",
      title: "Separacao de pedido",
      format: "A4",
      density: "Logistica",
      description: "Lista de itens com status, horario e observacoes.",
      recommendedDevice: a4Printer,
      readiness: "ok",
      helper: "Bom para entrega, separacao e conferencia."
    },
    {
      id: "tpl-close",
      title: "Fechamento de caixa",
      format: "A4",
      density: "Gerencial",
      description: "Resumo de vendas, pagamentos e pendencias do turno.",
      recommendedDevice: a4Printer,
      readiness: "ok",
      helper: "Uso do gerente ou dono ao final do expediente."
    },
    {
      id: "tpl-stock",
      title: "Reposicao rapida",
      format: "A4",
      density: "Operacional",
      description: "Produtos em alerta, cobertura e sugestao de compra.",
      recommendedDevice: a4Printer,
      readiness: "ok",
      helper: "Ajuda a loja a repor sem perder venda por falta de grade."
    }
  ];

  const jobs: PrintJobItem[] = [
    lastSale
      ? {
          id: `job-sale-${lastSale.id}`,
          title: "Cupom da ultima venda",
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
          helper: "Assim que houver uma venda, o historico de impressao entra aqui."
        },
    lastOrder
      ? {
          id: `job-order-${lastOrder.id}`,
          title: "Separacao do pedido em foco",
          format: "A4",
          status: lastOrder.status === "pronto" ? "Fila liberada" : "Conferencia",
          createdAt: lastOrder.updatedAt,
          helper: `Pedido ${lastOrder.id} com valor de ${formatCurrency(lastOrder.value)}.`
        }
      : {
          id: "job-order-empty",
          title: "Separacao de pedido",
          format: "A4",
          status: "Sem pedidos recentes",
          createdAt: new Date().toISOString(),
          helper: "A lista operacional aparece aqui quando houver pedidos na base."
        },
    {
      id: "job-stock",
      title: "Lista de reposicao",
      format: "A4",
      status: lowStockCount > 0 ? "Recomendado" : "Sob controle",
      createdAt: new Date().toISOString(),
      helper: `${formatNumber(lowStockCount)} alerta(s) de estoque baixo para conferencia interna.`
    },
    {
      id: "job-policy",
      title: "Politica de impressao do PDV",
      format: settings.defaultSalePrintTemplate === "tpl-80" ? "80 mm" : "58 mm",
      status:
        settings.salePrintBehavior === "auto"
          ? "Impressao automatica"
          : settings.salePrintBehavior === "preview"
            ? "Preview apos venda"
            : "Manual",
      createdAt: new Date().toISOString(),
      helper: `Template padrao do caixa: ${settings.defaultSalePrintTemplate === "tpl-80" ? "Cupom detalhado 80 mm" : "Comprovante PDV 58 mm"}.`
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
        `Horario: ${formatDate(lastSale?.createdAt ?? new Date().toISOString())}`
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
        `Loja: ${topProduct ? "Moda e Calcados" : "Loja local"}`,
        `Venda mais recente: ${formatDate(lastSale?.createdAt ?? new Date().toISOString())}`,
        `Itens no cupom: ${formatNumber(lastSale?.items.length ?? 0)}`,
        `Top produto: ${topProduct?.name ?? "Sem dados"} · ${topProduct?.color ?? "cor pendente"}`
      ],
      totals: [
        { label: "Total", value: formatCurrency(lastSale?.total ?? 0) },
        { label: "Ticket medio", value: formatCurrency(lastSale?.total ?? 0) },
        { label: "Pagamento", value: (lastSale?.paymentMethods ?? ["Pix"]).join(" / ") }
      ],
      footer: `Impressora sugerida: ${printer80}`
    },
    "tpl-label": {
      id: "tpl-label",
      title: topProduct?.name ?? "Etiqueta de produto",
      subtitle: `${topProduct?.sector === "roupas" ? "Setor roupas" : "Setor calcados"} · etiqueta varejo`,
      lines: [
        `SKU: ${topProduct?.sku ?? "SEM-SKU"}`,
        `Cor: ${topProduct?.color ?? "Sem cor"}`,
        `Grade: ${(topProduct?.variants ?? []).slice(0, 4).map((variant) => `${variant.size}:${variant.stock}`).join("  |  ") || "Sem grade"}`,
        `Codigo barras: ${topProduct?.barcode || "A definir"}`
      ],
      totals: [
        { label: "Preco", value: formatCurrency(topProduct?.salePrice ?? 0) },
        { label: "Promo", value: formatCurrency(topProduct?.promotionalPrice ?? topProduct?.salePrice ?? 0) }
      ],
      footer: `Impressora sugerida: ${labelPrinter}`
    },
    "tpl-order": {
      id: "tpl-order",
      title: "Separacao de pedido",
      subtitle: "A4 · conferencia interna",
      lines: [
        `Pedido: ${lastOrder?.id ?? "Sem pedido recente"}`,
        `Status: ${lastOrder?.status ?? "aguardando"}`,
        `Itens: ${formatNumber(lastOrder?.items ?? 0)}`,
        `Atualizacao: ${formatDate(lastOrder?.updatedAt ?? new Date().toISOString())}`
      ],
      totals: [{ label: "Valor", value: formatCurrency(lastOrder?.value ?? 0) }],
      footer: "Ideal para separacao, entrega e conferencia por setor."
    },
    "tpl-close": {
      id: "tpl-close",
      title: "Fechamento de caixa",
      subtitle: "A4 · fechamento do turno",
      lines: [
        `Vendas registradas: ${formatNumber(sales.length)}`,
        `Pedidos na base: ${formatNumber(orders.length)}`,
        `Estoque total: ${formatNumber(stockSnapshot.totalUnits)} unidades`,
        `Cobertura estimada: ${formatNumber(stockSnapshot.stockCoverageDays)} dias`
      ],
      totals: [
        { label: "Ultima venda", value: formatCurrency(lastSale?.total ?? 0) },
        { label: "Alertas estoque", value: formatNumber(lowStockCount) },
        { label: "Valor de estoque", value: formatCurrency(stockSnapshot.inventoryValue) }
      ],
      footer: "Use para auditoria diaria e conferencia gerencial."
    },
    "tpl-stock": {
      id: "tpl-stock",
      title: "Reposicao rapida",
      subtitle: "A4 · estoque e compras",
      lines: [
        `Produtos ativos: ${formatNumber(products.length)}`,
        `Alertas de reposicao: ${formatNumber(lowStockCount)}`,
        `Cobertura media: ${formatNumber(stockSnapshot.stockCoverageDays)} dias`,
        `Produto em foco: ${topProduct?.name ?? "Sem dados"}`
      ],
      totals: [
        { label: "Estoque total", value: formatNumber(stockSnapshot.totalUnits) },
        { label: "Valor imobilizado", value: formatCurrency(stockSnapshot.inventoryValue) }
      ],
      footer: "Fluxo recomendado para compra, conferencia e reposicao de grade."
    }
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

export function openPrintPreview(section: PrintPreviewSection): boolean {
  return openPrintPreviewWithOptions(section);
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
      @media print { body { padding: 0; } .sheet { border: 0; max-width: none; } }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>${escapeHtml(section.title)}</h1>
      <div class="subtitle">${escapeHtml(section.subtitle)}</div>
      <div class="block">${linesMarkup}</div>
      <div class="block">${totalsMarkup}</div>
      <div class="footer">${escapeHtml(section.footer ?? "Preview gerado pelo Smart Tech PDV")}</div>
    </div>
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
