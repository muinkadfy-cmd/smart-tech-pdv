import { APP_NAME, isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_TRIAL_DAYS, SUPABASE_URL } from "@/config/app";
import { licenseService } from "@/services/license/license.service";
import type { AuthSessionSnapshot, AuthUserProfile, LicensePackageType } from "@/stores/auth-store";
import { useAuthStore } from "@/stores/auth-store";
import type { UserRole } from "@/types/domain";

const STORAGE_KEY = "smart-tech:auth-session:v1";
const REFRESH_TOLERANCE_MS = 1000 * 60 * 5;

interface SupabaseUserPayload {
  id: string;
  email?: string;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

interface SupabaseTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUserPayload;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readStoredSession(): AuthSessionSnapshot | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthSessionSnapshot;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSessionSnapshot) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEY);
}

function getMetadataValue(user: SupabaseUserPayload, keys: string[]) {
  for (const key of keys) {
    const appValue = user.app_metadata?.[key];
    if (typeof appValue === "string" && appValue.trim()) {
      return appValue.trim();
    }

    const userValue = user.user_metadata?.[key];
    if (typeof userValue === "string" && userValue.trim()) {
      return userValue.trim();
    }
  }

  return null;
}

function normalizeRole(value: string | null): UserRole {
  if (value === "super_admin" || value === "super-admin" || value === "superadmin") {
    return "super_admin";
  }

  if (value === "admin" || value === "manager" || value === "gestor") {
    return "admin";
  }

  return "operador";
}

function normalizePackage(value: string | null): LicensePackageType {
  if (!value) {
    return "trial_15d";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "permanent" || normalized === "permanente" || normalized === "lifetime") {
    return "permanent";
  }

  return "trial_15d";
}

function isValidIsoDate(value: string | null | undefined) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function buildTrialEndDate(startedAt: string | null) {
  const base = isValidIsoDate(startedAt) ? new Date(startedAt as string) : new Date();
  base.setDate(base.getDate() + SUPABASE_TRIAL_DAYS);
  return base.toISOString();
}

function toDisplayName(user: SupabaseUserPayload) {
  const metadataName = getMetadataValue(user, ["full_name", "display_name", "name", "store_name"]);
  if (metadataName) {
    return metadataName;
  }

  if (user.email?.includes("@")) {
    const [local] = user.email.split("@");
    return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "Operador Smart Tech";
}

function mapSupabaseUser(user: SupabaseUserPayload): AuthUserProfile {
  const licensePackage = normalizePackage(getMetadataValue(user, ["license_package", "licensePackage", "plan_code", "planCode"]));
  const trialStartedAt = licensePackage === "trial_15d"
    ? getMetadataValue(user, ["trial_started_at", "trialStartAt", "trial_started_on"]) ?? user.created_at ?? new Date().toISOString()
    : null;

  return {
    id: user.id,
    email: user.email?.trim() ?? "",
    fullName: toDisplayName(user),
    role: normalizeRole(getMetadataValue(user, ["role", "app_role", "user_role"])),
    tenantId: getMetadataValue(user, ["tenant_id", "tenantId"]),
    licensePackage,
    trialStartedAt,
    trialEndsAt: licensePackage === "trial_15d" ? buildTrialEndDate(trialStartedAt) : null
  };
}

function buildSessionSnapshot(payload: SupabaseTokenPayload): AuthSessionSnapshot {
  const expiresAt =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    user: mapSupabaseUser(payload.user)
  };
}

function buildHeaders(accessToken?: string) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function getSupabaseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const directError = Reflect.get(payload, "error_description");
    if (typeof directError === "string" && directError.trim()) {
      return directError;
    }

    const message = Reflect.get(payload, "msg") ?? Reflect.get(payload, "message") ?? Reflect.get(payload, "error");
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function signInRequest(email: string, password: string): Promise<SupabaseTokenPayload> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password })
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload, "Não foi possível autenticar no Supabase."));
  }

  return payload as SupabaseTokenPayload;
}

async function refreshRequest(refreshToken: string): Promise<SupabaseTokenPayload> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload, "A sessão Supabase expirou e não pôde ser renovada."));
  }

  return payload as SupabaseTokenPayload;
}

async function loadCurrentUser(accessToken: string): Promise<SupabaseUserPayload> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: buildHeaders(accessToken)
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getSupabaseErrorMessage(payload, "Não foi possível carregar o perfil atual do Supabase."));
  }

  return payload as SupabaseUserPayload;
}

async function applyAuthenticatedSession(session: AuthSessionSnapshot) {
  persistSession(session);
  useAuthStore.getState().setSession(session);
  await licenseService.applySupabasePackageLicense({
    userId: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    tenantId: session.user.tenantId,
    packageType: session.user.licensePackage,
    trialStartedAt: session.user.trialStartedAt
  });
}

function looksLikeRevokedSession(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("invalid") || normalized.includes("expired") || normalized.includes("jwt") || normalized.includes("refresh");
}

function shouldRefreshSession(session: AuthSessionSnapshot) {
  if (!session.expiresAt) {
    return true;
  }

  return Date.parse(session.expiresAt) - REFRESH_TOLERANCE_MS <= Date.now();
}

export const supabaseAuthService = {
  isConfigured() {
    return isSupabaseConfigured();
  },

  getCachedSession() {
    return readStoredSession();
  },

  async bootstrap() {
    const authStore = useAuthStore.getState();
    authStore.setLoading();
    const cachedSession = readStoredSession();

    if (!cachedSession) {
      authStore.setAnonymous();
      return;
    }

    authStore.setSession(cachedSession);
    await licenseService.applySupabasePackageLicense({
      userId: cachedSession.user.id,
      email: cachedSession.user.email,
      fullName: cachedSession.user.fullName,
      tenantId: cachedSession.user.tenantId,
      packageType: cachedSession.user.licensePackage,
      trialStartedAt: cachedSession.user.trialStartedAt
    });

    if (!this.isConfigured() || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return;
    }

    try {
      if (shouldRefreshSession(cachedSession) && cachedSession.refreshToken) {
        const refreshed = buildSessionSnapshot(await refreshRequest(cachedSession.refreshToken));
        await applyAuthenticatedSession(refreshed);
        return;
      }

      const currentUser = await loadCurrentUser(cachedSession.accessToken);
      const nextSession: AuthSessionSnapshot = {
        ...cachedSession,
        user: mapSupabaseUser(currentUser)
      };
      await applyAuthenticatedSession(nextSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível validar a sessão Supabase.";
      if (looksLikeRevokedSession(message)) {
        clearStoredSession();
        useAuthStore.getState().setAnonymous();
        return;
      }
      useAuthStore.getState().setError(message);
    }
  },

  async signInWithPassword(email: string, password: string) {
    if (!this.isConfigured()) {
      throw new Error("Supabase ainda não está configurado nesta instalação. Defina URL e anon key para habilitar o login.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      throw new Error("Informe e-mail e senha para entrar.");
    }

    const session = buildSessionSnapshot(await signInRequest(normalizedEmail, password));
    await applyAuthenticatedSession(session);
    return session;
  },

  async signOut() {
    clearStoredSession();
    useAuthStore.getState().setAnonymous();
  },

  async refreshNow() {
    const currentSession = readStoredSession();
    if (!currentSession?.refreshToken || !this.isConfigured()) {
      return currentSession;
    }

    const refreshed = buildSessionSnapshot(await refreshRequest(currentSession.refreshToken));
    await applyAuthenticatedSession(refreshed);
    return refreshed;
  },

  getAppHint() {
    return `${APP_NAME} conectado ao Supabase`;
  }
};
