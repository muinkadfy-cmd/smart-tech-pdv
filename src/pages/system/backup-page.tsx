import { Database, Download, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ModuleHeader } from "@/components/shared/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backupService, type BackupStatus } from "@/features/system/backup.service";

export default function BackupPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busyAction, setBusyAction] = useState<"export" | "restore" | "reload" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setBusyAction("reload");
    setError(null);
    try {
      const snapshot = await backupService.getStatus();
      setStatus(snapshot);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Falha ao carregar o status do backup.");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleExport() {
    setBusyAction("export");
    setMessage(null);
    setError(null);

    try {
      const result = await backupService.exportNow();
      setMessage(`Backup exportado em ${result.exportedAt} como ${result.filename}.`);
      await loadStatus();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Não foi possível exportar o backup.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusyAction("restore");
    setMessage(null);
    setError(null);

    try {
      const raw = await file.text();
      const result = await backupService.restoreFromText(raw);
      setMessage(`${result.summary} Restaurado em ${result.restoredAt}.`);
      await loadStatus();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Não foi possível restaurar o backup.");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Dados locais protegidos"
        description="Exportação em JSON, restauração controlada e leitura rápida do estado da base local para reduzir risco operacional."
        eyebrow="Backup"
        title="Backup e restauração"
      />

      <input ref={inputRef} accept="application/json,.json" className="sr-only" onChange={handleFileChange} type="file" />

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {[
          { label: "Modo", value: status?.mode === "sqlite" ? "SQLite local" : "Demo / navegador", helper: status?.canRestore ? "Restauração completa liberada" : "Restauração completa só no desktop", icon: Database },
          { label: "Último backup", value: status?.lastExportAt ? status.summary.find((item) => item.label === "Último backup")?.value ?? "Agora" : "Nenhum", helper: "Gere uma nova cópia antes de mudanças críticas", icon: Download },
          { label: "Última restauração", value: status?.lastRestoreAt ? status.summary.find((item) => item.label === "Última restauração")?.value ?? "Agora" : "Nenhuma", helper: "Use apenas quando precisar retomar uma base íntegra", icon: Upload },
          { label: "Proteção", value: status?.canRestore ? "Cobertura completa" : "Exportação lógica", helper: status?.helper ?? "Carregando leitura da base local", icon: ShieldCheck }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="executive-panel" key={item.label}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="font-display text-[28px] font-semibold text-slate-50">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="surface-rule shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Base protegida</CardTitle>
                <p className="text-sm text-muted-foreground">{status?.helper ?? "Carregando status da base e do histórico de backups..."}</p>
              </div>
            </div>
            {status ? <Badge variant={status.canRestore ? "success" : "secondary"}>{status.mode === "sqlite" ? "Completo" : "Demo"}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(status?.summary ?? []).map((item) => (
                <div className="rounded-2xl bg-secondary/50 p-4" key={item.label}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-semibold text-slate-50">{item.value}</p>
                </div>
              ))}
            </div>

            {message ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 rounded-2xl" disabled={busyAction !== null} onClick={() => void handleExport()} type="button" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {busyAction === "export" ? "Exportando..." : "Exportar cópia"}
              </Button>
              <Button
                className="flex-1 rounded-2xl"
                disabled={!status?.canRestore || busyAction !== null}
                onClick={() => inputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" />
                {busyAction === "restore" ? "Restaurando..." : "Restaurar backup"}
              </Button>
              <Button className="rounded-2xl" disabled={busyAction !== null} onClick={() => void loadStatus()} type="button" variant="ghost">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="surface-rule shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Operação segura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O backup gera um arquivo completo em JSON com dados essenciais da operação local.</p>
              <p>A restauração repõe produtos, estoque, vendas, configurações e licença em uma única carga.</p>
              <p>Em modo demo ou navegador você ainda pode exportar uma fotografia lógica, mas a restauração total fica bloqueada.</p>
              <p>Antes de restaurar em produção, feche o caixa e confirme se o arquivo pertence a esta loja.</p>
            </CardContent>
          </Card>

          <Card className="surface-rule shadow-card">
            <CardContent className="p-5 text-sm text-muted-foreground">
              <p className="font-medium text-slate-50">Recomendação comercial</p>
              <p className="mt-2">Feche um backup novo antes de atualizações, importações em massa ou mudanças grandes de cadastro. Isso reduz risco e deixa o suporte muito mais rápido.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
