import { Database, Download, RefreshCw, Upload } from "lucide-react";
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
      setError(currentError instanceof Error ? currentError.message : "Falha ao carregar status do backup.");
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
      setError(currentError instanceof Error ? currentError.message : "Nao foi possivel exportar o backup.");
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
      setError(currentError instanceof Error ? currentError.message : "Nao foi possivel restaurar o backup.");
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
        description="Exportacao em JSON e restauracao controlada sobre a base local para reduzir risco de perda operacional."
        eyebrow="Backup"
        title="Backup e restauracao"
      />

      <input
        ref={inputRef}
        accept="application/json,.json"
        className="sr-only"
        onChange={handleFileChange}
        type="file"
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/80 bg-white/90 shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Base protegida</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {status?.helper ?? "Carregando status da base e do historico de backups..."}
                </p>
              </div>
            </div>
            {status ? <Badge variant={status.canRestore ? "success" : "secondary"}>{status.mode}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(status?.summary ?? []).map((item) => (
                <div className="rounded-2xl bg-secondary/50 p-4" key={item.label}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            {message ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 rounded-2xl" disabled={busyAction !== null} onClick={() => void handleExport()} type="button" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {busyAction === "export" ? "Exportando..." : "Exportar copia"}
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

        <Card className="border-white/80 bg-white/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Operacao segura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>O backup gera um arquivo completo em JSON com dados essenciais da operacao local.</p>
            <p>A restauracao repoe produtos, estoque, vendas, configuracoes e licenca em uma unica carga.</p>
            <p>Em modo demo/browser voce ainda pode exportar uma fotografia logica, mas a restauracao total fica bloqueada.</p>
            <p>Antes de restaurar em producao, feche o caixa e confirme se o arquivo pertence a esta loja.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
