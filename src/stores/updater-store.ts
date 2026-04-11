import { create } from "zustand";
import { checkForUpdates, installAvailableUpdate } from "@/services/updater.service";
import type { UpdateCheckState } from "@/types/domain";

interface UpdaterNoticeSnooze {
  version: string | null;
  status: UpdateCheckState["status"];
  until: string;
}

interface UpdaterStoreState {
  state: UpdateCheckState;
  autoChecked: boolean;
  bannerVisible: boolean;
  snoozedNotice: UpdaterNoticeSnooze | null;
  installBusy: boolean;
  forcedUpdateVersion: string | null;
  forceUpdateRequired: boolean;
  setState: (state: UpdateCheckState, options?: { autoChecked?: boolean }) => void;
  checkNow: (mode?: "startup" | "manual") => Promise<UpdateCheckState>;
  installNow: () => Promise<UpdateCheckState>;
  showBanner: () => void;
  dismissBanner: () => void;
}

const UPDATER_SNOOZE_KEY = "smart-tech:updater-notice-snooze";
const AVAILABLE_SNOOZE_MS = 1000 * 60 * 60 * 4;
const INSTALLED_SNOOZE_MS = 1000 * 60 * 60;
const ERROR_SNOOZE_MS = 1000 * 60 * 30;

const initialState: UpdateCheckState = {
  status: "idle",
  message: "Pronto para consultar o latest.json do canal configurado."
};

function isMandatoryUpdateStatus(status: UpdateCheckState["status"]) {
  return status === "available" || status === "installing" || status === "installed";
}

function isRelevantBannerStatus(status: UpdateCheckState["status"]) {
  return isMandatoryUpdateStatus(status) || status === "error";
}

function getStoredSnooze(): UpdaterNoticeSnooze | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(UPDATER_SNOOZE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<UpdaterNoticeSnooze>;
    if (typeof parsed.until !== "string" || Number.isNaN(Date.parse(parsed.until))) {
      window.localStorage.removeItem(UPDATER_SNOOZE_KEY);
      return null;
    }

    if (Date.parse(parsed.until) <= Date.now()) {
      window.localStorage.removeItem(UPDATER_SNOOZE_KEY);
      return null;
    }

    return {
      version: typeof parsed.version === "string" ? parsed.version : null,
      status: parsed.status ?? "idle",
      until: parsed.until
    };
  } catch {
    window.localStorage.removeItem(UPDATER_SNOOZE_KEY);
    return null;
  }
}

function persistSnooze(snooze: UpdaterNoticeSnooze | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!snooze) {
    window.localStorage.removeItem(UPDATER_SNOOZE_KEY);
    return;
  }

  window.localStorage.setItem(UPDATER_SNOOZE_KEY, JSON.stringify(snooze));
}

function normalizeSnooze(snooze: UpdaterNoticeSnooze | null) {
  if (!snooze) {
    return null;
  }

  if (Number.isNaN(Date.parse(snooze.until)) || Date.parse(snooze.until) <= Date.now()) {
    persistSnooze(null);
    return null;
  }

  return snooze;
}

function isSnoozedForState(state: UpdateCheckState, snooze: UpdaterNoticeSnooze | null) {
  const activeSnooze = normalizeSnooze(snooze);
  if (!activeSnooze || !isRelevantBannerStatus(state.status)) {
    return false;
  }

  if (activeSnooze.status !== state.status) {
    return false;
  }

  if (state.status === "available" || state.status === "installed") {
    return activeSnooze.version === (state.version ?? null);
  }

  return true;
}

function clearSnoozeIfVersionChanged(state: UpdateCheckState, snooze: UpdaterNoticeSnooze | null) {
  const activeSnooze = normalizeSnooze(snooze);
  if (!activeSnooze) {
    return null;
  }

  if ((state.status === "available" || state.status === "installed") && state.version && activeSnooze.version !== state.version) {
    persistSnooze(null);
    return null;
  }

  return activeSnooze;
}

function buildSnooze(state: UpdateCheckState): UpdaterNoticeSnooze | null {
  const durationMs =
    state.status === "error" ? ERROR_SNOOZE_MS : 0;

  if (durationMs <= 0) {
    return null;
  }

  return {
    version: state.version ?? null,
    status: state.status,
    until: new Date(Date.now() + durationMs).toISOString()
  };
}

function resolveForcedUpdateVersion(state: UpdateCheckState, currentForcedVersion: string | null) {
  if (state.status === "available") {
    return state.version ?? currentForcedVersion;
  }

  if (state.status === "installing" || state.status === "installed" || state.status === "error") {
    return state.version ?? currentForcedVersion;
  }

  if (state.status === "idle" || state.status === "latest") {
    return null;
  }

  return currentForcedVersion;
}

function isForceUpdateRequired(state: UpdateCheckState, forcedUpdateVersion: string | null) {
  if (!forcedUpdateVersion) {
    return false;
  }

  return state.status !== "idle" && state.status !== "latest";
}

export const useUpdaterStore = create<UpdaterStoreState>((set, get) => ({
  state: initialState,
  autoChecked: false,
  bannerVisible: false,
  snoozedNotice: getStoredSnooze(),
  installBusy: false,
  forcedUpdateVersion: null,
  forceUpdateRequired: false,
  setState: (state, options) =>
    set((current) => {
      const nextForcedUpdateVersion = resolveForcedUpdateVersion(state, current.forcedUpdateVersion);
      const mandatoryUpdateActive = isForceUpdateRequired(state, nextForcedUpdateVersion);
      const nextSnooze = clearSnoozeIfVersionChanged(state, current.snoozedNotice);
      return {
        state,
        autoChecked: options?.autoChecked ?? current.autoChecked,
        installBusy: current.installBusy,
        forcedUpdateVersion: nextForcedUpdateVersion,
        forceUpdateRequired: mandatoryUpdateActive,
        bannerVisible: mandatoryUpdateActive || (isRelevantBannerStatus(state.status) && !isSnoozedForState(state, nextSnooze)),
        snoozedNotice: mandatoryUpdateActive ? null : nextSnooze
      };
    }),
  checkNow: async (mode = "manual") => {
    const current = get();
    if (current.installBusy || current.state.status === "checking") {
      return current.state;
    }

    const checkingState: UpdateCheckState = {
      status: "checking",
      message: mode === "startup" ? "Verificando atualização em segundo plano..." : "Verificando nova versão..."
    };

    set((state) => ({
      ...state,
      state: checkingState,
      bannerVisible: state.bannerVisible && isRelevantBannerStatus(state.state.status)
    }));

    const result = await checkForUpdates();

    set((state) => {
      const nextForcedUpdateVersion = resolveForcedUpdateVersion(result, state.forcedUpdateVersion);
      const mandatoryUpdateActive = isForceUpdateRequired(result, nextForcedUpdateVersion);
      const nextSnooze = clearSnoozeIfVersionChanged(result, state.snoozedNotice);
      const manualBanner = result.status !== "idle" && result.status !== "checking";
      return {
        state: result,
        autoChecked: true,
        installBusy: false,
        forcedUpdateVersion: nextForcedUpdateVersion,
        forceUpdateRequired: mandatoryUpdateActive,
        bannerVisible: mandatoryUpdateActive || (mode === "manual" ? manualBanner : isRelevantBannerStatus(result.status) && !isSnoozedForState(result, nextSnooze)),
        snoozedNotice: mandatoryUpdateActive ? null : nextSnooze
      };
    });

    return result;
  },
  installNow: async () => {
    const current = get();
    if (current.installBusy) {
      return current.state;
    }

    const targetVersion = current.state.version ?? current.forcedUpdateVersion ?? undefined;
    set((state) => ({
      ...state,
      installBusy: true,
      forcedUpdateVersion: targetVersion ?? state.forcedUpdateVersion,
      forceUpdateRequired: true,
      bannerVisible: true,
      state: {
        status: "installing",
        version: targetVersion,
        message: targetVersion ? `Baixando e preparando a versão obrigatória ${targetVersion}...` : "Baixando e preparando a atualização obrigatória...",
        details: "O uso do sistema fica bloqueado até essa instalação terminar com segurança.",
        checkedAt: new Date().toISOString()
      }
    }));

    const result = await installAvailableUpdate();
    const nextState =
      result.status === "error" && targetVersion
        ? {
            ...result,
            version: targetVersion,
            message: `Falha ao instalar a atualização obrigatória ${targetVersion}.`,
            details: result.details
              ? `${result.details} O sistema permanece bloqueado até a instalação ser concluída.`
              : "O sistema permanece bloqueado até a instalação obrigatória ser concluída."
          }
        : result;

    set((state) => ({
      ...state,
      state: nextState,
      installBusy: false,
      forcedUpdateVersion: resolveForcedUpdateVersion(nextState, state.forcedUpdateVersion),
      forceUpdateRequired: isForceUpdateRequired(nextState, resolveForcedUpdateVersion(nextState, state.forcedUpdateVersion)),
      bannerVisible: isForceUpdateRequired(nextState, resolveForcedUpdateVersion(nextState, state.forcedUpdateVersion)),
      snoozedNotice: null
    }));
    if (nextState.status === "installed") {
      persistSnooze(null);
    }

    return nextState;
  },
  showBanner: () =>
    set((current) => ({
      ...current,
      bannerVisible: current.forceUpdateRequired || (current.state.status !== "idle" && current.state.status !== "checking")
    })),
  dismissBanner: () =>
    set((current) => {
      if (current.forceUpdateRequired) {
        return {
          ...current,
          bannerVisible: true
        };
      }

      const snooze = buildSnooze(current.state);
      persistSnooze(snooze);
      return {
        ...current,
        bannerVisible: false,
        installBusy: false,
        snoozedNotice: snooze
      };
    })
}));
