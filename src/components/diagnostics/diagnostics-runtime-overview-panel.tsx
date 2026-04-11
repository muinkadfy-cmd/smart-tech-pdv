import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { DiagnosticsRuntimeSummary } from "@/types/domain";

interface DiagnosticsRuntimeOverviewPanelProps {
  summary: DiagnosticsRuntimeSummary;
  onClear: () => void;
  onCopy: () => void;
}

export function DiagnosticsRuntimeOverviewPanel({ summary, onClear, onCopy }: DiagnosticsRuntimeOverviewPanelProps) {
  return (
    <Card className="surface-rule">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Monitor técnico de falhas</CardTitle>
          <p className="mt-2 text-sm text-slate-400">
            Captura console error, console warning, promise sem tratamento, erro de render e falha de carga para apoiar o pente-fino do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCopy} size="sm" variant="outline">Copiar relatório</Button>
          <Button onClick={onClear} size="sm" variant="outline">Limpar capturas</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {([
            ["Erros", String(summary.errorCount), "destructive"],
            ["Warnings", String(summary.warningCount), "warning"],
            ["Infos", String(summary.infoCount), "outline"],
            ["Fontes", String(summary.sources.length), "success"]
          ] as const).map(([label, value, variant]) => (
            <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4" key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-display text-[24px] font-semibold text-slate-50">{value}</p>
                <Badge variant={variant}>{label === "Infos" ? "registro" : label === "Fontes" ? "origem" : label.toLowerCase()}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Última captura</p>
            <p className="mt-3 font-semibold text-slate-50">{summary.lastRecordedAt ? formatDate(summary.lastRecordedAt) : "Sem evento recente"}</p>
            <p className="mt-2 text-sm text-slate-400">Use este painel para saber se a base segue limpa durante navegação, cadastros, impressão e sync.</p>
          </div>
          <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Fontes monitoradas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.sources.length > 0 ? summary.sources.map((source) => <Badge key={source} variant="outline">{source}</Badge>) : <Badge variant="outline">aguardando eventos</Badge>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
