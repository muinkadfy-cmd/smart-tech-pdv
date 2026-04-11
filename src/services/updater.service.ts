import { APP_UPDATER_ENDPOINT, APP_VERSION, getUpdaterChannelLabel } from "@/config/app";
import { isTauriRuntime } from "@/lib/tauri";
import { appRepository } from "@/repositories/app-repository";
import type { UpdateCheckState } from "@/types/domain";

function normalizeUpdaterError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "Erro desconhecido");
  const normalized = message.toLowerCase();

  if (!message.trim()) {
    return {
      message: "Falha ao consultar atualizações.",
      details: "O runtime não retornou detalhes. Verifique se a release pública com latest.json já foi publicada no GitHub."
    };
  }

  if (normalized.includes("404") || normalized.includes("not found") || normalized.includes("latest.json")) {
    return {
      message: "Release pública ainda não encontrada.",
      details: "O app conseguiu chegar no endpoint, mas o latest.json ou a release mais recente ainda não estão publicados do jeito esperado."
    };
  }

  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("dns") || normalized.includes("timeout")) {
    return {
      message: "Falha de rede ao consultar atualizações.",
      details: "A verificação não conseguiu chegar no GitHub Releases. Confirme internet, firewall e acesso ao endpoint do updater."
    };
  }

  if (normalized.includes("signature") || normalized.includes("pubkey") || normalized.includes("key")) {
    return {
      message: "Configuração de assinatura do updater inconsistente.",
      details: "A release existe, mas a chave pública ou a assinatura não bateram com o pacote publicado."
    };
  }

  return {
    message: "Falha ao consultar atualizações.",
    details: message
  };
}

export async function checkForUpdates(): Promise<UpdateCheckState> {
  let channelLabel = "Canal estável";
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
      message: `Modo demo ativo. ${channelLabel} apontado para ${APP_UPDATER_ENDPOINT}.`,
      details: "O aviso automático de update só aparece no runtime desktop Tauri.",
      checkedAt: new Date().toISOString()
    };
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update) {
      return {
        status: "available",
        version: update.version,
        message: `Nova versão obrigatória ${update.version} encontrada no ${channelLabel.toLowerCase()}.`,
        details: "Esta instalação entra em modo obrigatório e precisa concluir o update antes de continuar o uso.",
        checkedAt: new Date().toISOString()
      };
    }

    return {
      status: "latest",
      version: APP_VERSION,
      message: `Esta instalação já está na última versão disponível no ${channelLabel.toLowerCase()}.`,
      details: "Nenhuma release mais nova foi encontrada para este canal.",
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    const normalized = normalizeUpdaterError(error);
    return {
      status: "error",
      message: normalized.message,
      details: normalized.details,
      checkedAt: new Date().toISOString()
    };
  }
}

export async function installAvailableUpdate() {
  if (!isTauriRuntime()) {
    return {
      status: "error",
      message: "Instalação de update disponível apenas no app desktop.",
      details: "No navegador ou modo demo o updater não consegue baixar nem instalar lotes.",
      checkedAt: new Date().toISOString()
    } satisfies UpdateCheckState;
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      return {
        status: "latest",
        version: APP_VERSION,
        message: "Nenhuma atualização pendente para instalar.",
        details: "O app já está alinhado com a release atual do canal configurado.",
        checkedAt: new Date().toISOString()
      } satisfies UpdateCheckState;
    }

    await update.downloadAndInstall();

    return {
      status: "installed",
      version: update.version,
      message: `Atualização obrigatória ${update.version} pronta para concluir a instalação.`,
      details: "Feche e reabra o app para concluir. O sistema permanece bloqueado até finalizar esse passo.",
      checkedAt: new Date().toISOString()
    } satisfies UpdateCheckState;
  } catch (error) {
    const normalized = normalizeUpdaterError(error);
    return {
      status: "error",
      message: normalized.message,
      details: normalized.details,
      checkedAt: new Date().toISOString()
    } satisfies UpdateCheckState;
  }
}
