export const APP_NAME = "Smart Tech PDV";
export const APP_VERSION = "2.0.9";
export const APP_ENV = import.meta.env.APP_ENV ?? import.meta.env.MODE;
export const APP_UPDATER_ENDPOINT =
  import.meta.env.TAURI_UPDATER_ENDPOINT ??
  "https://github.com/muinkadfy-cmd/smart-tech-pdv/releases/latest/download/latest.json";
export const SUPPORT_EMAIL = "suporte@smarttech.local";
export const SUPPORT_WHATSAPP = "(43) 99669-4751";

const rawCloudApiBaseUrl = (import.meta.env.VITE_CLOUD_API_URL ?? "").trim().replace(/\/$/, "");

/** Base URL da API cloud (prefixo /api incluido). Ex.: https://api.minhaloja.com/api */
export const CLOUD_API_BASE_URL = rawCloudApiBaseUrl;

/** Opcional: autenticacao simples do endpoint de sync em ambientes controlados */
export const SYNC_API_KEY = import.meta.env.VITE_SYNC_API_KEY ?? "";

export function isCloudApiConfigured() {
  return CLOUD_API_BASE_URL.length > 0;
}

export function isLocalCloudEndpoint() {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(CLOUD_API_BASE_URL);
}

export function getCloudEndpointLabel() {
  if (!isCloudApiConfigured()) {
    return "Nao configurado";
  }

  return isLocalCloudEndpoint() ? `${CLOUD_API_BASE_URL} (ambiente local)` : CLOUD_API_BASE_URL;
}

export function getCloudModeLabel() {
  if (!isCloudApiConfigured()) {
    return "Somente offline";
  }

  return isLocalCloudEndpoint() ? "Cloud local de homologacao" : "Cloud publico configurado";
}

export function isLocalCloudApi() {
  return isLocalCloudEndpoint();
}

export function getUpdaterChannelLabel(channel = "stable") {
  return channel === "beta" ? "Canal beta" : "Canal estavel";
}









