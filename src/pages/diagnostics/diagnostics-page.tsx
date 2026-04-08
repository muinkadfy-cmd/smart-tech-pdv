import { APP_ENV } from "@/config/app";
import { buildDiagnosticsChecklist, buildDiagnosticsHealth } from "@/features/diagnostics/diagnostics.service";
import { DiagnosticsChecklistPanel } from "@/components/diagnostics/diagnostics-checklist-panel";
import { DiagnosticsHealthPanel } from "@/components/diagnostics/diagnostics-health-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { useDiagnosticsSnapshot } from "@/hooks/use-app-data";
import { useCurrentVersion } from "@/hooks/use-current-version";
import { formatDate } from "@/lib/utils";

export default function DiagnosticsPage() {
  const { data, loading } = useDiagnosticsSnapshot();
  const version = useCurrentVersion();

  if (loading || !data) {
    return <PageLoader />;
  }

  const healthItems = buildDiagnosticsHealth(data.databaseStatus, data.updaterStatus, APP_ENV);
  const checklistItems = buildDiagnosticsChecklist();

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Base para suporte tecnico"
        description="Versao, banco, backup, updater, sinais de saude e checklist tecnico em uma tela mais util para suporte e auditoria."
        eyebrow="Diagnostico"
        title="Saude do aplicativo"
      />
      <div className="grid gap-4 xl:grid-cols-4">
        {[
          ["Versao", version],
          ["Banco local", data.databaseStatus],
          ["Ultimo backup", formatDate(data.lastBackupAt)],
          ["Ambiente", APP_ENV]
        ].map(([label, value]) => (
          <Card className="border-white/80 bg-white/90" key={label}>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-semibold text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DiagnosticsHealthPanel items={healthItems} />
        <DiagnosticsChecklistPanel items={checklistItems} />
      </div>
      <Card className="border-white/80 bg-white/90">
        <CardContent className="space-y-3 p-6">
          <p className="font-semibold text-slate-950">Logs basicos</p>
          {data.logs.map((line) => (
            <div className="rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100" key={line}>
              {line}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
