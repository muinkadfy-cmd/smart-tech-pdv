import { useMemo, useState } from "react";
import { APP_ENV } from "@/config/app";
import { buildDiagnosticsChecklist, buildDiagnosticsHealth } from "@/features/diagnostics/diagnostics.service";
import { DiagnosticsChecklistPanel } from "@/components/diagnostics/diagnostics-checklist-panel";
import { DiagnosticsHealthPanel } from "@/components/diagnostics/diagnostics-health-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { invalidateAppDataCache, useDiagnosticsSnapshot } from "@/hooks/use-app-data";
import { useCurrentVersion } from "@/hooks/use-current-version";
import { formatDate } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { getRecentAuditEntries } from "@/services/audit/audit-log.service";
import { buildRuntimeDiagnosticsReport, clearRuntimeDiagnostics } from "@/services/diagnostics/runtime-diagnostics.service";
import type { DiagnosticsRuntimeEntry, DiagnosticsRuntimeSeverity, StressTestLoadResult, StressTestPreset } from "@/types/domain";

function getSeverityVariant(severity: DiagnosticsRuntimeSeverity) {
  if (severity === "error") return "destructive" as const;
  if (severity === "warning") return "warning" as const;
  return "success" as const;
}

function getSeverityLabel(severity: DiagnosticsRuntimeSeverity) {
  if (severity === "error") return "Erro";
  if (severity === "warning") return "Warning";
  return "Info";
}

export default function DiagnosticsPage() {
  const { data, loading, reload } = useDiagnosticsSnapshot();
  const version = useCurrentVersion();
  const [busyPreset, setBusyPreset] = useState<StressTestPreset | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [runtimeFilter, setRuntimeFilter] = useState<"all" | DiagnosticsRuntimeSeverity>("all");
  const [lastLoadResult, setLastLoadResult] = useState<StressTestLoadResult | null>(null);

  async function handleGenerateLoad(preset: StressTestPreset) {
    setBusyPreset(preset);
    setLoadError(null);
    setLoadMessage(null);

    try {
      const result = await appRepository.generateStressTestData(preset);
      setLastLoadResult(result);
      setLoadMessage(result.summary);
      invalidateAppDataCache();
      reload();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível aplicar a carga fake.");
    } finally {
      setBusyPreset(null);
    }
  }

  async function handleCopyReport() {
    if (!data) {
      return;
    }

    try {
      await navigator.clipboard.writeText(buildRuntimeDiagnosticsReport(data.runtime));
      setCopyFeedback("Resumo técnico copiado.");
      window.setTimeout(() => setCopyFeedback(null), 2400);
    } catch {
      setCopyFeedback("Não foi possível copiar o relatório agora.");
      window.setTimeout(() => setCopyFeedback(null), 2400);
    }
  }

  function handleClearRuntimeEvents() {
    clearRuntimeDiagnostics();
    invalidateAppDataCache("diagnostics-snapshot");
    reload();
  }

  const runtimeEvents = useMemo(() => {
    if (!data) {
      return [] as DiagnosticsRuntimeEntry[];
    }

    return runtimeFilter === "all"
      ? data.runtime.events
      : data.runtime.events.filter((entry) => entry.severity === runtimeFilter);
  }, [data, runtimeFilter]);

  if (loading || !data) {
    return <PageLoader />;
  }

  const healthItems = buildDiagnosticsHealth(data.databaseStatus, data.updaterStatus, APP_ENV);
  const checklistItems = buildDiagnosticsChecklist();
  const auditEntries = getRecentAuditEntries(10);
  const runtimeSummary = data.runtime.summary;

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Monitor técnico local"
        description="Acompanhe erros reais de runtime, warnings agrupados, verificação externa obrigatória e sinais da base local em uma central mais útil para endurecer o sistema."
        eyebrow="Diagnóstico"
        title="Saúde do aplicativo"
      />

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: "Versão", value: version, variant: "outline" as const, chip: "local" },
          { label: "Banco local", value: data.databaseStatus, variant: "success" as const, chip: "ok" },
          { label: "Erros", value: String(runtimeSummary.errorCount), variant: runtimeSummary.errorCount > 0 ? "destructive" as const : "success" as const, chip: "runtime" },
          { label: "Warnings", value: String(runtimeSummary.warningCount), variant: runtimeSummary.warningCount > 0 ? "warning" as const : "success" as const, chip: "console" },
          { label: "Último backup", value: formatDate(data.lastBackupAt), variant: "outline" as const, chip: "local" },
          { label: "Ambiente", value: APP_ENV, variant: "outline" as const, chip: "shell" }
        ].map((item) => (
          <Card className="surface-rule" key={item.label}>
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <Badge variant={item.variant}>{item.chip}</Badge>
              </div>
              <p className="font-semibold text-slate-50">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <Card className="surface-rule">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-50">Eventos capturados no runtime</p>
                <p className="mt-1 text-sm text-slate-400">Os registros abaixo ajudam a enxergar falhas reais que passaram pelo uso da interface.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "error", "warning", "info"] as const).map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => setRuntimeFilter(filter)}
                    size="sm"
                    variant={runtimeFilter === filter ? "default" : "outline"}
                  >
                    {filter === "all" ? "Todos" : getSeverityLabel(filter)}
                  </Button>
                ))}
                <Button onClick={() => void handleCopyReport()} size="sm" variant="outline">Copiar relatório</Button>
                <Button onClick={handleClearRuntimeEvents} size="sm" variant="ghost">Limpar capturas</Button>
              </div>
            </div>
            {copyFeedback ? <div className="system-alert system-alert--success">{copyFeedback}</div> : null}
            {runtimeEvents.length > 0 ? (
              runtimeEvents.map((entry) => (
                <div className="premium-tile rounded-[28px] border border-[rgba(201,168,111,0.14)] p-5" key={entry.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getSeverityVariant(entry.severity)}>{getSeverityLabel(entry.severity)}</Badge>
                      <Badge variant="outline">{entry.source}</Badge>
                      <Badge variant="secondary">{entry.module}</Badge>
                      {entry.count > 1 ? <Badge variant="warning">{entry.count}x repetido</Badge> : null}
                    </div>
                    <p className="text-[12px] text-slate-400">{formatDate(entry.lastSeenAt)}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-lg font-semibold text-slate-50">{entry.title}</p>
                    <p className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">{entry.message}</p>
                    <div className="flex flex-wrap gap-3 text-[12px] text-slate-400">
                      <span>Rota: {entry.routePath}</span>
                      <span>Primeira vez: {formatDate(entry.firstSeenAt)}</span>
                    </div>
                    {entry.detail ? (
                      <details className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3 text-sm text-slate-300">
                        <summary className="cursor-pointer font-medium text-slate-100">Abrir detalhe técnico</summary>
                        <pre className="mt-3 whitespace-pre-wrap font-mono text-[12px] leading-6 text-slate-300">{entry.detail}</pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-box text-sm">Nenhum evento real capturado nesta sessão. Continue usando o sistema para alimentar o histórico técnico.</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-rule">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="font-semibold text-slate-50">Verificações externas obrigatórias</p>
                <p className="mt-1 text-sm text-slate-400">Tipagem e warnings de build não nascem no runtime. Estes comandos continuam sendo a blindagem para pegar falha antes de venda ou release.</p>
              </div>
              {[
                ["Tipagem obrigatória", "Pega erro de TypeScript antes de virar quebra silenciosa no runtime.", "obrigatório", "npm run type-check"],
                ["Build da interface", "Revela imports quebrados, warnings de empacotamento e regressões de compilação.", "obrigatório", "npm run build"],
                ["Checklist de release", "Confere updater, ACL, janela, guardas e pontos sensíveis antes de venda ou atualização.", "pré-release", "npm run release:check"]
              ].map(([title, helper, chip, command]) => (
                <div className="premium-tile rounded-[28px] border border-[rgba(201,168,111,0.14)] p-5" key={title}>
                  <p className="font-semibold text-slate-50">{title}</p>
                  <p className="mt-2 text-sm text-slate-400">{helper}</p>
                  <Badge className="mt-3 w-fit" variant="outline">{chip}</Badge>
                  <div className="mt-4 rounded-[22px] bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100">{command}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <DiagnosticsHealthPanel items={healthItems} />
          <DiagnosticsChecklistPanel items={checklistItems} />
        </div>
      </div>

      <Card className="surface-rule">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-50">Carga fake operacional</p>
              <p className="mt-1 text-sm text-slate-400">Gera clientes, produtos, vendas, pedidos, compras e financeiro fake para testar comportamento, scroll, margens e densidade da interface.</p>
            </div>
            <span className="rounded-full border border-[rgba(201,168,111,0.24)] bg-[rgba(201,168,111,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e5c785]">offline-first</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {([
              ["small", "Carga leve", "Boa para validar cards, busca e densidade sem poluir demais a base."],
              ["medium", "Carga média", "Boa para testar operação mais realista do balcão e telas de gestão."],
              ["large", "Carga pesada", "Boa para revelar gargalos de scroll, layout, render e comportamento geral."]
            ] as const).map(([preset, label, helper]) => (
              <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-4" key={preset}>
                <p className="text-sm font-semibold text-slate-50">{label}</p>
                <p className="mt-2 text-sm text-slate-400">{helper}</p>
                <Button className="mt-4 w-full" disabled={busyPreset !== null} onClick={() => void handleGenerateLoad(preset)} size="sm">
                  {busyPreset === preset ? "Carregando..." : `Aplicar ${label.toLowerCase()}`}
                </Button>
              </div>
            ))}
          </div>
          {loadMessage ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{loadMessage}</div> : null}
          {loadError ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{loadError}</div> : null}
          {lastLoadResult ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {[
                ["Clientes", String(lastLoadResult.customersCreated)],
                ["Produtos", String(lastLoadResult.productsCreated)],
                ["Vendas", String(lastLoadResult.salesCreated)],
                ["Movimentos", String(lastLoadResult.stockMovementsCreated)]
              ].map(([label, value]) => (
                <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-3" key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-rule">
        <CardContent className="space-y-3 p-6">
          <p className="font-semibold text-slate-50">Logs básicos</p>
          {data.logs.map((line) => (
            <div className="rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100" key={line}>
              {line}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="surface-rule">
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-slate-50">Trilha local de auditoria</p>
            <span className="text-[12px] text-slate-400">{auditEntries.length} ações recentes em memória local</span>
          </div>
          {auditEntries.length > 0 ? (
            auditEntries.map((entry) => (
              <div className="premium-tile rounded-2xl border border-[rgba(201,168,111,0.14)] px-4 py-3" key={entry.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.area}</span>
                  <span className="text-[13px] font-semibold text-slate-50">{entry.action}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{entry.details}</p>
                {entry.actorName ? <p className="mt-1 text-[12px] text-slate-400">Por {entry.actorName}{entry.actorRole ? ` • ${entry.actorRole}` : ""}</p> : null}
                <p className="mt-1 text-[12px] text-slate-400">{formatDate(entry.createdAt)}</p>
              </div>
            ))
          ) : (
            <div className="empty-state-box text-sm">As próximas ações operacionais críticas vão aparecer aqui para suporte e conferência local.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
