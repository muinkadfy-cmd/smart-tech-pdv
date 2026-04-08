import { APP_NAME } from "@/config/app";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PrinterDeviceItem } from "@/features/printing/printing.service";
import type { Product, Sale, SettingsSnapshot } from "@/types/domain";

interface PrintPreviewPayload {
  templateId: string;
  settings: SettingsSnapshot;
  products: Product[];
  sales: Sale[];
  devices: PrinterDeviceItem[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTemplateWidth(templateId: string) {
  if (templateId === "tpl-58") return "58mm";
  if (templateId === "tpl-80") return "80mm";
  if (templateId === "tpl-label") return "58mm";
  return "210mm";
}

function buildReceiptBody(payload: PrintPreviewPayload, detailed: boolean) {
  const sale = payload.sales[0];
  const items = sale?.items ?? payload.products.slice(0, 3).map((product) => ({
    productId: product.id,
    size: product.variants[0]?.size ?? "U",
    quantity: 1,
    unitPrice: product.promotionalPrice ?? product.salePrice
  }));

  const lines = items
    .map((item) => {
      const product = payload.products.find((entry) => entry.id === item.productId);
      return `
        <tr>
          <td>${escapeHtml(product?.name ?? item.productId)}</td>
          <td>${escapeHtml(item.size)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
        </tr>
      `;
    })
    .join("");

  const subtotal = sale?.subtotal ?? items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = sale?.discount ?? 0;
  const total = sale?.total ?? subtotal - discount;
  const payment = sale?.paymentMethods.join(" + ") ?? "Pix";

  return `
    <section class="receipt">
      <h1>${escapeHtml(payload.settings.companyName || APP_NAME)}</h1>
      <p class="muted">Cupom de teste • ${formatDate(new Date().toISOString())}</p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Tam</th>
            <th>Qtd</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>${lines}</tbody>
      </table>
      ${detailed ? `<p class="muted">Pagamentos: ${escapeHtml(payment)}</p>` : ""}
      <div class="totals">
        <p><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></p>
        <p><span>Desconto</span><strong>${formatCurrency(discount)}</strong></p>
        <p class="grand"><span>Total</span><strong>${formatCurrency(total)}</strong></p>
      </div>
      <p class="footer">Obrigado pela preferencia. Suporte e garantia seguem configuracao da loja.</p>
    </section>
  `;
}

function buildLabelBody(payload: PrintPreviewPayload) {
  const product = payload.products[0];
  const variant = product?.variants[0];
  return `
    <section class="label-card">
      <p class="muted">${escapeHtml(payload.settings.companyName || APP_NAME)}</p>
      <h1>${escapeHtml(product?.name ?? "Produto premium")}</h1>
      <p>SKU ${escapeHtml(product?.sku ?? "SEM-SKU")}</p>
      <p>Tamanho ${escapeHtml(variant?.size ?? "U")}</p>
      <div class="price">${formatCurrency(product?.promotionalPrice ?? product?.salePrice ?? 0)}</div>
      <div class="barcode">|||| ||| |||| |||</div>
    </section>
  `;
}

function buildA4SummaryBody(payload: PrintPreviewPayload, title: string) {
  const products = payload.products.slice(0, 6);
  const rows = products
    .map((product) => {
      const units = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      return `
        <tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.sku)}</td>
          <td>${units}</td>
          <td>${formatCurrency(product.salePrice)}</td>
        </tr>
      `;
    })
    .join("");

  const deviceList = payload.devices
    .map((device) => `<li>${escapeHtml(device.name)} • ${escapeHtml(device.status)}</li>`)
    .join("");

  return `
    <section class="a4-sheet">
      <header>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(payload.settings.companyName || APP_NAME)} • ${formatDate(new Date().toISOString())}</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Unidades</th>
            <th>Preco</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <section class="notes">
        <h2>Dispositivos</h2>
        <ul>${deviceList}</ul>
      </section>
    </section>
  `;
}

export function createPrintPreviewHtml(payload: PrintPreviewPayload) {
  const titleByTemplate: Record<string, string> = {
    "tpl-a4": "Resumo operacional",
    "tpl-order": "Separacao de pedido",
    "tpl-close": "Fechamento de caixa"
  };

  let body = "";
  if (payload.templateId === "tpl-58") {
    body = buildReceiptBody(payload, false);
  } else if (payload.templateId === "tpl-80") {
    body = buildReceiptBody(payload, true);
  } else if (payload.templateId === "tpl-label") {
    body = buildLabelBody(payload);
  } else {
    body = buildA4SummaryBody(payload, titleByTemplate[payload.templateId] ?? "Documento operacional");
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Preview de impressao</title>
        <style>
          :root {
            color-scheme: light;
            font-family: Inter, Arial, sans-serif;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 16px;
            background: #f8fafc;
            color: #0f172a;
          }
          .sheet {
            width: ${getTemplateWidth(payload.templateId)};
            max-width: 100%;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 10px 35px rgba(15, 23, 42, 0.12);
          }
          h1, h2, p { margin: 0; }
          .muted { color: #64748b; font-size: 12px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 12px;
          }
          th, td {
            text-align: left;
            padding: 8px 4px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .totals {
            margin-top: 16px;
            display: grid;
            gap: 6px;
          }
          .totals p {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }
          .totals .grand {
            font-size: 16px;
            font-weight: 700;
          }
          .footer {
            margin-top: 16px;
            font-size: 11px;
            text-align: center;
          }
          .label-card {
            display: grid;
            gap: 8px;
            text-align: center;
          }
          .price {
            font-size: 28px;
            font-weight: 800;
          }
          .barcode {
            padding-top: 4px;
            letter-spacing: 3px;
            font-weight: 700;
          }
          .a4-sheet {
            display: grid;
            gap: 18px;
          }
          .notes ul {
            margin: 8px 0 0;
            padding-left: 18px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .sheet {
              width: 100%;
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="sheet">${body}</main>
      </body>
    </html>
  `;
}

export function openPrintPreview(payload: PrintPreviewPayload, autoPrint = false) {
  const html = createPrintPreviewHtml(payload);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) {
    throw new Error("Nao foi possivel abrir a janela de preview. Verifique se o bloqueador esta ativo.");
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();

  if (autoPrint) {
    popup.addEventListener("load", () => {
      popup.print();
    });
  }
}
