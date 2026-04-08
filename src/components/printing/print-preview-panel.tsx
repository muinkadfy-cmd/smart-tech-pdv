import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrintPreviewSection } from "@/features/printing/printing.service";

export function PrintPreviewPanel({
  preview,
  onPrint,
  onCopy
}: {
  preview: PrintPreviewSection;
  onPrint: () => void;
  onCopy: () => void;
}) {
  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{preview.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{preview.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCopy} variant="outline">
            <Copy className="h-4 w-4" />
            Copiar conteudo
          </Button>
          <Button onClick={onPrint}>
            <Printer className="h-4 w-4" />
            Abrir preview
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-[360px] rounded-[28px] border border-dashed border-slate-300 bg-white p-5 shadow-sm">
          <div>
            <p className="font-display text-xl font-semibold text-slate-950">{preview.title}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{preview.subtitle}</p>
          </div>

          <div className="mt-5 space-y-2 text-sm text-slate-700">
            {preview.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {preview.totals?.length ? (
            <div className="mt-5 space-y-2 border-t border-dashed border-slate-300 pt-4 text-sm text-slate-800">
              {preview.totals.map((row) => (
                <div className="flex items-center justify-between gap-4" key={`${row.label}-${row.value}`}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {preview.footer ? <p className="mt-5 text-xs leading-5 text-slate-500">{preview.footer}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
