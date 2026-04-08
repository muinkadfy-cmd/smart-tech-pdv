import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExportPreset } from "@/features/reports/reports.service";

export function ReportExportPanel({ presets }: { presets: ExportPreset[] }) {
  return (
    <Card className="surface-rule border-white/80 bg-white/92">
      <CardHeader>
        <CardTitle>Central de exportacao</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.map((preset) => (
          <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-3.5" key={preset.id}>
            <p className="text-[14px] font-semibold text-slate-950">{preset.title}</p>
            <p className="mt-2 text-[13px] leading-5 text-slate-600">{preset.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
