import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrintPreviewSection } from "@/features/printing/printing.service";

export function PrintPreviewPanel({
  preview,
  onPrint,
  onOpenPreview,
  onCopy
}: {
  preview: PrintPreviewSection;
  onPrint: () => void;
  onOpenPreview: () => void;
  onCopy: () => void;
}) {
  return (
    <Card className="surface-rule">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{preview.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{preview.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCopy} variant="outline">
            <Copy className="h-4 w-4" />
            Copiar conteúdo
          </Button>
          <Button onClick={onOpenPreview} variant="outline">
            <Printer className="h-4 w-4" />
            Abrir janela
          </Button>
          <Button onClick={onPrint}>
            <Printer className="h-4 w-4" />
            Imprimir agora
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-[360px] rounded-[28px] border border-dashed border-[#cbd5e1] bg-[#fcfcfd] p-5 shadow-sm">
          <div>
            <p className="font-display text-xl font-semibold text-[#0f172a]">{preview.title}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">{preview.subtitle}</p>
          </div>

          <div className="mt-5 space-y-2 text-sm text-[#334155]">
            {preview.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {preview.totals?.length ? (
            <div className="mt-5 space-y-2 border-t border-dashed border-[#cbd5e1] pt-4 text-sm text-[#0f172a]">
              {preview.totals.map((row) => (
                <div className="flex items-center justify-between gap-4" key={`${row.label}-${row.value}`}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {preview.barcodeValue ? (
            <div className="mt-5 space-y-2 border-t border-dashed border-[#cbd5e1] pt-4">
              <div className="flex min-h-[64px] items-end justify-center gap-[1px]">
                {preview.barcodeValue.replace(/\D/g, "").split("").flatMap((digit, digitIndex) => {
                  const base = Number(digit);
                  const widths = [1 + ((base + digitIndex) % 3), 1 + ((base + 1) % 3), 1 + ((base + 2 + digitIndex) % 3), 1 + ((base + 1 + digitIndex) % 3)];

                  return widths.map((width, widthIndex) => (
                    <span
                      className={widthIndex % 2 === 0 ? "bg-[#0f172a]" : "bg-transparent"}
                      key={`${digitIndex}-${widthIndex}`}
                      style={{ width: `${width}px`, height: "64px", display: "block" }}
                    />
                  ));
                })}
              </div>
              <p className="text-center font-mono text-[12px] tracking-[0.24em] text-[#334155]">{preview.barcodeValue.replace(/\D/g, "")}</p>
            </div>
          ) : null}

          {preview.footer ? <p className="mt-5 text-xs leading-5 text-[#64748b]">{preview.footer}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
