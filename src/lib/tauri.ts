import { APP_VERSION } from "@/config/app";

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getRuntimeAppVersion() {
  if (!isTauriRuntime()) {
    return APP_VERSION;
  }

  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return APP_VERSION;
  }
}

export async function finalizeInstalledUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  if (!isTauriRuntime()) {
    window.location.reload();
    return;
  }

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {
    window.location.reload();
  }
}
