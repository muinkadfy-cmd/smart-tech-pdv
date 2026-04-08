import { Cloud, RefreshCw, Shield, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getCloudEndpointLabel, getCloudModeLabel, isCloudApiConfigured } from "@/config/app";
import { ModuleHeader } from "@/components/shared/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { licenseService } from "@/services/license/license.service";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { runSyncCycle } from "@/sync/sync-engine";
import { useLicenseStore } from "@/stores/license-store";
import { useSyncStore } from "@/stores/sync-store";

export default function LicenseSyncPage() {
  const licenseStatus = useLicenseStore((s) => s.status);
  const planLabel = useLicenseStore((s) => s.planLabel);
  const expiresAt = useLicenseStore((s) => s.expiresAt);
  const offlineGraceUntil = useLicenseStore((s) => s.offlineGraceUntil);
  const installationId = useLicenseStore((s) => s.installationId);
  const syncPending = useSyncStore((s) => s.pendingCount);
  const syncLast = useSyncStore((s) => s.lastSyncAt);
  const syncOnline = useSyncStore((s) => s.isOnline);
  const syncError = useSyncStore((s) => s.lastError);
  const syncSyncing = useSyncStore((s) => s.isSyncing);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void syncQueueService.refreshPendingCount();
  }, []);

  async function handleRefreshLicense() {
    setLoading(true);
    setActionMessage(null);
    try {
      await licenseService.refreshFromCloud();
      setActionMessage("Licenca local atualizada com o ultimo snapshot disponivel.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableLocalMode() {
    setLoading(true);
    setActionMessage(null);
    try {
      await licenseService.enableLocalMode();
      setActionMessage("Modo local offline ativado para o cliente continuar trabalhando no PC.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={loading} onClick={handleRefreshLicense} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Atualizar licenca
            </Button>
            <Button disabled={loading} onClick={handleEnableLocalMode} type="button">
              <ShieldCheck className="h-4 w-4" />
              Liberar modo local
            </Button>
          </div>
        }
        badge="Nuvem + offline"
        description="Fluxo pensado para deixar o balcao rodando offline sem perder governanca de licenca, fila de sync e readiness de cloud."
        eyebrow="SaaS"
        title="Licenca e sincronizacao"
      />

      {actionMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMessage}</div> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-white/80 bg-white/90 shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Licenca local</CardTitle>
                <p className="text-sm text-muted-foreground">Snapshot salvo para operar offline.</p>
              </div>
            </div>
            <Badge variant={licenseStatus === "active" ? "success" : licenseStatus === "grace" ? "warning" : "outline"}>{licenseStatus}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
              <p className="mt-1 font-semibold text-slate-950">{planLabel === "—" ? "Modo local" : planLabel}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Validade</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{expiresAt ? formatDate(expiresAt) : "Sem bloqueio local"}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Janela offline</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{offlineGraceUntil ? formatDate(offlineGraceUntil) : "Pronta para operar"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
              Instalacao <span className="font-medium text-slate-950">{installationId ?? "ainda nao registrada"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90 shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Endpoint cloud</CardTitle>
                <p className="text-sm text-muted-foreground">Ajuste de producao e homologacao.</p>
              </div>
            </div>
            <Badge variant={isCloudApiConfigured() ? "default" : "outline"}>{getCloudModeLabel()}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Endpoint</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-950">{getCloudEndpointLabel()}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
              {!isCloudApiConfigured()
                ? "Sem cloud configurado: prioridade total para operacao offline local."
                : "Quando o endpoint estiver publico, ativacao, licenca e sync ficam prontos para rollout em campo."}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90 shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Fila de sync</CardTitle>
                <p className="text-sm text-muted-foreground">Eventos aguardando envio.</p>
              </div>
            </div>
            <Badge variant={syncOnline ? "success" : "warning"}>{syncOnline ? "Online" : "Offline"}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</p>
                <p className="mt-1 font-semibold text-slate-950">{syncPending}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultima sync</p>
                <p className="mt-1 font-semibold text-slate-950">{syncLast ? formatDate(syncLast) : "Ainda nao enviada"}</p>
              </div>
            </div>
            {syncError ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{syncError}</p>
            ) : null}
            <Button className="w-full rounded-2xl" disabled={!syncOnline || syncSyncing} onClick={() => void runSyncCycle()} type="button" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {syncSyncing ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
