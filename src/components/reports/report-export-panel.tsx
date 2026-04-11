import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ExportPreset } from "@/features/reports/reports.service";

interface ReportExportPanelProps {
  presets: ExportPreset[];
  periodLabel: string;
  onCopy: (presetId: string) => void;
  onPrint: (presetId: string) => void;
  onPreview: (presetId: string) => void;
}

export function ReportExportPanel({ presets, periodLabel, onCopy, onPrint, onPreview }: ReportExportPanelProps) {
  return (
    <Card className="surface-rule">
      <CardHeader>
        <CardTitle>Central de exportação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="premium-tile rounded-[18px] p-3.5">
          <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">Recorte ativo</p>
          <p className="mt-2 text-sm font-semibold text-slate-50">{periodLabel}</p>
          <p className="mt-2 text-[13px] leading-5 text-slate-400">Exporte um resumo para gestão, compras ou financeiro sem sair da análise atual.</p>
        </div>
        {presets.map((preset) => (
          <div className="premium-tile rounded-[18px] p-3.5" key={preset.id}>
            <p className="text-[14px] font-semibold text-slate-50">{preset.title}</p>
            <p className="mt-2 text-[13px] leading-5 text-slate-400">{preset.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => onPreview(preset.id)} size="sm" variant="outline">
                Abrir preview
              </Button>
              <Button onClick={() => onPrint(preset.id)} size="sm" variant="outline">
                Imprimir
              </Button>
              <Button onClick={() => onCopy(preset.id)} size="sm">
                Copiar resumo
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
