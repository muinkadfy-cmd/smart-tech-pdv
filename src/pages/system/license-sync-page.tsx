import { Cloud, RefreshCw, Shield, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function getLicenseTone(status: string) {
  if (status === "active") {
    return { badge: "success" as const, label: "Ativa" };
  }

  if (status === "grace") {
    return { badge: "warning" as const, label: "Tolerância offline" };
  }

  if (status === "expired") {
    return { badge: "destructive" as const, label: "Expirada" };
  }

  return { badge: "outline" as const, label: "Modo local" };
}

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

  const licenseTone = getLicenseTone(licenseStatus);
  const syncHeadline = useMemo(() => {
    if (syncSyncing) {
      return "Sincronização em andamento";
    }

    if (!syncOnline) {
      return "Fila protegida para operação offline";
    }

    if (syncPending > 0) {
      return "Fila pronta para enviar quando você confirmar";
    }

    return "Fila sob controle";
  }, [syncOnline, syncPending, syncSyncing]);

  async function handleRefreshLicense() {
    setLoading(true);
    setActionMessage(null);
    try {
      await licenseService.refreshFromCloud();
      setActionMessage("Licença local atualizada com o último snapshot disponível.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableLocalMode() {
    setLoading(true);
    setActionMessage(null);
    try {
      await licenseService.enableLocalMode();
      setActionMessage("Modo local offline liberado para a loja continuar operando no PC.");
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
              Atualizar licença
            </Button>
            <Button disabled={loading} onClick={handleEnableLocalMode} type="button">
              <ShieldCheck className="h-4 w-4" />
              Liberar modo local
            </Button>
          </div>
        }
        badge="Nuvem + offline"
        description="Governança de licença, fila de sincronização e prontidão de cloud em uma leitura mais executiva para suporte e operação da loja."
        eyebrow="SaaS"
        title="Licença e sincronização"
      />

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMessage}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {[
          { label: "Plano ativo", value: planLabel === "—" ? "Modo local" : planLabel, helper: licenseTone.label, icon: Shield },
          { label: "Última sync", value: syncLast ? formatDate(syncLast) : "Ainda não enviada", helper: syncHeadline, icon: RefreshCw },
          { label: "Pendências", value: String(syncPending), helper: syncOnline ? "Rede disponível para fila cloud" : "Aguardando conexão para enviar", icon: WifiOff },
          { label: "Cloud", value: getCloudModeLabel(), helper: isCloudApiConfigured() ? "Endpoint pronto para rollout" : "Operação local protegida", icon: Cloud }
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="surface-rule shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Licença local</CardTitle>
                <p className="text-sm text-muted-foreground">Snapshot salvo para a loja seguir vendendo mesmo sem internet.</p>
              </div>
            </div>
            <Badge variant={licenseTone.badge}>{licenseTone.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
              <p className="mt-1 font-semibold text-slate-50">{planLabel === "—" ? "Modo local" : planLabel}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Validade</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{expiresAt ? formatDate(expiresAt) : "Sem bloqueio local"}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Janela offline</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{offlineGraceUntil ? formatDate(offlineGraceUntil) : "Pronta para operar"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
              Instalação <span className="font-medium text-slate-50">{installationId ?? "ainda não registrada"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-rule shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Endpoint cloud</CardTitle>
                <p className="text-sm text-muted-foreground">Leitura atual do ambiente de produção ou homologação.</p>
              </div>
            </div>
            <Badge variant={isCloudApiConfigured() ? "default" : "outline"}>{getCloudModeLabel()}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Endpoint</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-50">{getCloudEndpointLabel()}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
              {!isCloudApiConfigured()
                ? "Sem cloud configurado: prioridade total para operação local, com ativação assistida quando a nuvem estiver pronta."
                : "Quando o endpoint estiver público, ativação, licença e sync ficam prontos para rollout em campo."}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-rule shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Fila de sincronização</CardTitle>
                <p className="text-sm text-muted-foreground">Eventos aguardando envio, sem travar a operação local.</p>
              </div>
            </div>
            <Badge variant={syncOnline ? "success" : "warning"}>{syncOnline ? "Online" : "Offline"}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</p>
                <p className="mt-1 font-semibold text-slate-50">{syncPending}</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Última sync</p>
                <p className="mt-1 font-semibold text-slate-50">{syncLast ? formatDate(syncLast) : "Ainda não enviada"}</p>
              </div>
            </div>
            {syncError ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{syncError}</p>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
                {syncHeadline}. Use a ação manual quando quiser forçar o envio da fila.
              </div>
            )}
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
