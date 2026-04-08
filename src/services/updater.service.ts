import { APP_UPDATER_ENDPOINT, APP_VERSION, getUpdaterChannelLabel } from "@/config/app";
import { isTauriRuntime } from "@/lib/tauri";
import type { UpdateCheckState } from "@/types/domain";
import { appRepository } from "@/repositories/app-repository";

export async function checkForUpdates(): Promise<UpdateCheckState> {
  let channelLabel = "Canal estavel";
  try {
    const settings = await appRepository.getSettingsSnapshot();
    channelLabel = getUpdaterChannelLabel(settings.updaterChannel);
  } catch {
    /* fallback para environments sem base carregada */
  }

  if (!isTauriRuntime()) {
    return {
      status: "latest",
      version: APP_VERSION,
      message: `Modo demo ativo. ${channelLabel} apontado para ${APP_UPDATER_ENDPOINT}.`
    };
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update) {
      return {
        status: "available",
        version: update.version,
        message: `Nova versao ${update.version} encontrada no ${channelLabel.toLowerCase()}.`
      };
    }

    return {
      status: "latest",
      version: APP_VERSION,
      message: `Esta instalacao ja esta na ultima versao disponivel no ${channelLabel.toLowerCase()}.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Falha ao consultar atualizacoes."
    };
  }
}

export async function installAvailableUpdate() {
  if (!isTauriRuntime()) {
    return;
  }

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (update) {
    await update.downloadAndInstall();
  }
}
