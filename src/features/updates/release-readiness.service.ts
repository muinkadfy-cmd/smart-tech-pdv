import { APP_UPDATER_ENDPOINT, APP_VERSION, CLOUD_API_BASE_URL } from "@/config/app";
import { getRuntimeAppVersion, isTauriRuntime } from "@/lib/tauri";
import { resolveSyncTarget } from "@/services/sync/sync-target";

export interface ReleaseReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  helper: string;
}

export interface ReleaseReadinessSnapshot {
  score: number;
  headline: string;
  checks: ReleaseReadinessCheck[];
}

function isSemanticVersion(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function isHttpsUrl(value: string) {
  return /^https:\/\//i.test(value);
}

export async function getReleaseReadinessSnapshot(): Promise<ReleaseReadinessSnapshot> {
  const runtimeVersion = await getRuntimeAppVersion();
  const syncTarget = await resolveSyncTarget();
  const cloudConfigured = CLOUD_API_BASE_URL.trim().length > 0;
  const cloudLocal = /localhost|127\.0\.0\.1/i.test(CLOUD_API_BASE_URL);
  const checks: ReleaseReadinessCheck[] = [
    {
      id: "version-format",
      label: "Versão semântica",
      ok: isSemanticVersion(APP_VERSION),
      helper: `Versão atual do app: ${APP_VERSION}.`
    },
    {
      id: "runtime-version",
      label: "Versão em runtime alinhada",
      ok: runtimeVersion === APP_VERSION,
      helper: `Runtime reportou ${runtimeVersion}.`
    },
    {
      id: "tauri-runtime",
      label: "Execução desktop",
      ok: isTauriRuntime(),
      helper: isTauriRuntime() ? "Plugin updater e SQLite operacionais no runtime desktop." : "Modo browser/demo limita updater e restauração completa."
    },
    {
      id: "updater-endpoint",
      label: "Updater apontando para latest.json",
      ok: isHttpsUrl(APP_UPDATER_ENDPOINT) && /latest\.json$/i.test(APP_UPDATER_ENDPOINT),
      helper: APP_UPDATER_ENDPOINT
    },
    {
      id: "cloud-endpoint",
      label: "API cloud configurada para produção",
      ok: cloudConfigured && !cloudLocal,
      helper: !cloudConfigured
        ? "Modo offline puro ativo. A nuvem ainda não está configurada para rollout comercial."
        : cloudLocal
          ? `${CLOUD_API_BASE_URL} ainda aponta para ambiente local.`
          : CLOUD_API_BASE_URL
    },
    {
      id: "network",
      label: "Rede disponivel",
      ok: typeof navigator === "undefined" ? true : navigator.onLine,
      helper: typeof navigator === "undefined" ? "Ambiente sem navigator." : navigator.onLine ? "Online para validar updater e licença." : "Offline: updater e sync ficam degradados."
    },
    {
      id: "sync-target",
      label: "Tenant/instalação configurados",
      ok: Boolean(syncTarget?.tenantId && syncTarget.installationId),
      helper: syncTarget ? `Tenant ${syncTarget.tenantId} pronto para fila cloud.` : "Ainda falta ativação, licença ou variáveis de sync."
    }
  ];

  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const headline =
    score >= 85
      ? "Release bem encaminhado para empacotamento."
      : score >= 60
        ? "Release intermediário: ainda faltam ajustes antes de vender como pronto."
        : "Release ainda incompleto para distribuição segura.";

  return { score, headline, checks };
}
