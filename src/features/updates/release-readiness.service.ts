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
  const checks: ReleaseReadinessCheck[] = [
    {
      id: "version-format",
      label: "Versao semantica",
      ok: isSemanticVersion(APP_VERSION),
      helper: `Versao atual do app: ${APP_VERSION}.`
    },
    {
      id: "runtime-version",
      label: "Versao em runtime alinhada",
      ok: runtimeVersion === APP_VERSION,
      helper: `Runtime reportou ${runtimeVersion}.`
    },
    {
      id: "tauri-runtime",
      label: "Execucao desktop",
      ok: isTauriRuntime(),
      helper: isTauriRuntime() ? "Plugin updater e SQLite operacionais no runtime desktop." : "Modo browser/demo limita updater e restauracao completa."
    },
    {
      id: "updater-endpoint",
      label: "Updater apontando para latest.json",
      ok: isHttpsUrl(APP_UPDATER_ENDPOINT) && /latest\.json$/i.test(APP_UPDATER_ENDPOINT),
      helper: APP_UPDATER_ENDPOINT
    },
    {
      id: "cloud-endpoint",
      label: "API cloud fora de localhost",
      ok: !/localhost|127\.0\.0\.1/i.test(CLOUD_API_BASE_URL),
      helper: CLOUD_API_BASE_URL
    },
    {
      id: "network",
      label: "Rede disponivel",
      ok: typeof navigator === "undefined" ? true : navigator.onLine,
      helper: typeof navigator === "undefined" ? "Ambiente sem navigator." : navigator.onLine ? "Online para validar updater e licenca." : "Offline: updater e sync ficam degradados."
    },
    {
      id: "sync-target",
      label: "Tenant/instalacao configurados",
      ok: Boolean(syncTarget?.tenantId && syncTarget.installationId),
      helper: syncTarget ? `Tenant ${syncTarget.tenantId} pronto para fila cloud.` : "Ainda falta ativacao/licenca ou variaveis de sync."
    }
  ];

  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const headline =
    score >= 85
      ? "Release bem encaminhado para empacotamento."
      : score >= 60
        ? "Release intermediario: ainda faltam ajustes antes de vender como pronto."
        : "Release ainda incompleto para distribuicao segura.";

  return { score, headline, checks };
}
