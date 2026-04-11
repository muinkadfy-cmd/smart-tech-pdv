import { APP_UPDATER_ENDPOINT, CLOUD_API_BASE_URL } from "@/config/app";
import { isTauriRuntime } from "@/lib/tauri";
import { appRepository } from "@/repositories/app-repository";
import { resolveSyncTarget } from "@/services/sync/sync-target";
import { backupService } from "@/features/system/backup.service";

export interface OfflineReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  helper: string;
}

export interface OfflineReadinessSnapshot {
  score: number;
  ready: boolean;
  headline: string;
  checks: OfflineReadinessCheck[];
  blockers: string[];
}

function isUpdaterEndpointReady(value: string) {
  return /^https:\/\//i.test(value) && /latest\.json$/i.test(value);
}

export async function getOfflineReadinessSnapshot(): Promise<OfflineReadinessSnapshot> {
  const [settings, diagnostics, products, sales, backupStatus, syncTarget] = await Promise.all([
    appRepository.getSettingsSnapshot(),
    appRepository.getDiagnosticsSnapshot(),
    appRepository.getProducts(),
    appRepository.getSales(),
    backupService.getStatus(),
    resolveSyncTarget().catch(() => null)
  ]);

  const coreChecks: OfflineReadinessCheck[] = [
    {
      id: "desktop-runtime",
      label: "Runtime desktop",
      ok: isTauriRuntime(),
      helper: isTauriRuntime() ? "Tauri ativo: SQLite, backup e updater completos na máquina." : "No navegador a operação fica limitada e não representa a entrega desktop." 
    },
    {
      id: "local-database",
      label: "Banco local pronto",
      ok: diagnostics.databaseStatus.toLowerCase().includes("sqlite") || diagnostics.databaseStatus.toLowerCase().includes("conectado"),
      helper: diagnostics.databaseStatus
    },
    {
      id: "catalog-ready",
      label: "Catalogo e venda local",
      ok: products.length > 0,
      helper: `${products.length} produtos carregados e ${sales.length} vendas ja podem ser lidas pela base local.`
    },
    {
      id: "backup-restore",
      label: "Backup e restauracao local",
      ok: backupStatus.mode === "sqlite" && backupStatus.canRestore,
      helper: backupStatus.helper
    },
    {
      id: "updater-ready",
      label: "Recurso de atualizacao configurado",
      ok: isUpdaterEndpointReady(APP_UPDATER_ENDPOINT) && settings.updaterChannel.trim().length > 0,
      helper: `Canal ${settings.updaterChannel} apontando para ${APP_UPDATER_ENDPOINT}.`
    },
    {
      id: "company-settings",
      label: "Configuracoes minimas da loja",
      ok: settings.companyName.trim().length > 2 && settings.thermalPrinter58.trim().length > 2 && settings.autoBackup.trim().length > 0,
      helper: `${settings.companyName} • ${settings.thermalPrinter58} • backup ${settings.autoBackup}.`
    }
  ];

  const bonusChecks: OfflineReadinessCheck[] = [
    {
      id: "cloud-optional",
      label: "Cloud publico para futuras melhorias",
      ok: !/localhost|127\.0\.0\.1/i.test(CLOUD_API_BASE_URL),
      helper: /localhost|127\.0\.0\.1/i.test(CLOUD_API_BASE_URL)
        ? "Ainda está em localhost. Isso não impede o offline, mas a nuvem final ainda precisa ser publicada."
        : `Endpoint publico configurado em ${CLOUD_API_BASE_URL}.`
    },
    {
      id: "sync-target",
      label: "Identidade de instalação",
      ok: Boolean(syncTarget?.installationId),
      helper: syncTarget?.installationId ? `Instalacao ${syncTarget.installationId} pronta para fila de sync.` : "Sem installationId ativo ainda. Operacao offline continua funcionando."
    }
  ];

  const checks = [...coreChecks, ...bonusChecks];
  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const ready = coreChecks.every((check) => check.ok);
  const blockers = coreChecks.filter((check) => !check.ok).map((check) => check.label);
  const headline = ready
    ? "Parte offline pronta para o cliente trabalhar, com base local, backup e recurso de atualizacao ja encaixados."
    : "Offline ainda não está totalmente fechado. Corrija os bloqueios abaixo antes de considerar pronto para uso de cliente.";

  return {
    score,
    ready,
    headline,
    checks,
    blockers
  };
}
