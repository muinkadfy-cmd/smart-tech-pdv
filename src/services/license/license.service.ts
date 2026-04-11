/**
 * Ativação e validação de licença: online quando possível;
 * snapshot em license_snapshot + tolerancia offline (grace).
 */
import { CLOUD_API_BASE_URL, getCloudModeLabel, isCloudApiConfigured } from "@/config/app";
import { licenseSnapshotRepository } from "@/repositories/license-snapshot-repository";
import type { LicenseStatus } from "@/stores/license-store";
import { useLicenseStore } from "@/stores/license-store";
import type { LicensePackageType } from "@/stores/auth-store";

const SUPABASE_TRIAL_DAYS = 15;
const SUPABASE_GRACE_DAYS = 3;

export interface ActivationCloudResponse {
  installationId: string;
  tenantId: string;
  planCode?: string;
  planLabel?: string;
  status: string;
  expiresAt?: string | null;
  offlineGraceUntil?: string | null;
}

export interface ActivationResult {
  ok: boolean;
  message?: string;
  storePatch?: {
    status: LicenseStatus;
    planLabel: string;
    expiresAt: string | null;
    offlineGraceUntil: string | null;
    installationId: string | null;
    source?: string | null;
  };
}

export interface SupabasePackageLicenseInput {
  userId: string;
  email: string;
  fullName: string;
  tenantId?: string | null;
  packageType: LicensePackageType;
  trialStartedAt?: string | null;
}

function mapStatus(s: string): LicenseStatus {
  if (s === "active") {
    return "active";
  }
  if (s === "grace") {
    return "grace";
  }
  if (s === "expired") {
    return "expired";
  }
  return "unknown";
}

function planLabelFrom(data: ActivationCloudResponse): string {
  return data.planLabel ?? data.planCode ?? "Profissional";
}

function toIsoWithDays(baseDate: string | null | undefined, days: number) {
  const date = baseDate && !Number.isNaN(Date.parse(baseDate)) ? new Date(baseDate) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function resolveSupabasePackageSnapshot(input: SupabasePackageLicenseInput) {
  const installationId = `sb-${input.userId}`;
  const tenantId = input.tenantId?.trim() || `tenant-${input.userId}`;

  if (input.packageType === "permanent") {
    return {
      installationId,
      tenantId,
      status: "active" as LicenseStatus,
      planLabel: "Licença permanente",
      expiresAt: null,
      offlineGraceUntil: null
    };
  }

  const trialStartedAt = input.trialStartedAt ?? new Date().toISOString();
  const expiresAt = toIsoWithDays(trialStartedAt, SUPABASE_TRIAL_DAYS);
  const offlineGraceUntil = toIsoWithDays(expiresAt, SUPABASE_GRACE_DAYS);
  const now = Date.now();
  const expiresAtTime = Date.parse(expiresAt);
  const graceTime = Date.parse(offlineGraceUntil);
  const status: LicenseStatus = now <= expiresAtTime ? "active" : now <= graceTime ? "grace" : "expired";

  return {
    installationId,
    tenantId,
    status,
    planLabel: "Trial 15 dias",
    expiresAt,
    offlineGraceUntil
  };
}

export const licenseService = {
  async activateWithKey(activationKey: string): Promise<ActivationResult> {
    const key = activationKey.trim();
    if (key.length < 4) {
      return { ok: false, message: "Informe a chave completa." };
    }

    if (!isCloudApiConfigured()) {
      return { ok: false, message: "Endpoint cloud não configurado. Use o modo local/offline para liberar a operação no PC." };
    }

    try {
      const res = await fetch(`${CLOUD_API_BASE_URL}/activation/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: key })
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, message: text || `Erro HTTP ${res.status}` };
      }

      const data = (await res.json()) as ActivationCloudResponse;

      try {
        await licenseSnapshotRepository.upsert({
          installationId: data.installationId,
          tenantId: data.tenantId,
          planCode: data.planCode ?? data.planLabel,
          planLabel: data.planLabel,
          status: data.status,
          expiresAt: data.expiresAt ?? null,
          offlineGraceUntil: data.offlineGraceUntil ?? null,
          payload: {
            source: "activation",
            at: new Date().toISOString(),
            planLabel: planLabelFrom(data),
            cloudMode: getCloudModeLabel()
          }
        });
      } catch {
        /* Preview no navegador sem Tauri/SQLite: licença só em memória nesta sessão */
      }

      return {
        ok: true,
        storePatch: {
          status: mapStatus(data.status),
          planLabel: planLabelFrom(data),
          expiresAt: data.expiresAt ?? null,
          offlineGraceUntil: data.offlineGraceUntil ?? null,
          installationId: data.installationId,
          source: "activation"
        }
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha de rede na ativação";
      return { ok: false, message };
    }
  },

  async enableLocalMode(): Promise<void> {
    const current = await licenseSnapshotRepository.load();
    const installationId = current?.installation_id ?? `local-${crypto.randomUUID()}`;
    const offlineGraceUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    try {
      await licenseSnapshotRepository.upsert({
        installationId,
        tenantId: current?.tenant_id ?? "local",
        planLabel: "Modo local offline",
        status: "active",
        expiresAt: null,
        offlineGraceUntil,
        payload: {
          source: "local-mode",
          at: new Date().toISOString(),
          planLabel: "Modo local offline",
          cloudMode: getCloudModeLabel()
        }
      });
    } catch {
      /* em preview web sem SQLite, segue apenas em memória */
    }

    useLicenseStore.getState().setSnapshot({
      status: "active",
      planLabel: "Modo local offline",
      expiresAt: null,
      offlineGraceUntil,
      installationId,
      source: "local-mode"
    });
  },

  async hydrateStoreFromDatabase(): Promise<void> {
    const row = await licenseSnapshotRepository.load();
    if (!row) {
      return;
    }

    let planLabel = row.plan_code ?? "Modo local";
    let source: string | null = null;
    if (row.payload_json) {
      try {
        const parsed = JSON.parse(row.payload_json) as { planLabel?: string; source?: string };
        if (parsed.planLabel) {
          planLabel = String(parsed.planLabel);
        }
        source = typeof parsed.source === "string" ? parsed.source : null;
      } catch {
        /* ignore */
      }
    }

    useLicenseStore.getState().setSnapshot({
      status: mapStatus(row.status),
      planLabel,
      expiresAt: row.expires_at,
      offlineGraceUntil: row.offline_grace_until,
      installationId: row.installation_id,
      source
    });
  },

  async refreshFromCloud(): Promise<void> {
    if (!isCloudApiConfigured()) {
      return;
    }

    const row = await licenseSnapshotRepository.load();
    if (!row?.installation_id || !row.tenant_id) {
      return;
    }

    if (row.payload_json) {
      try {
        const payload = JSON.parse(row.payload_json) as { source?: string };
        if (payload.source === "supabase-auth") {
          return;
        }
      } catch {
        /* ignore */
      }
    }

    try {
      const url = new URL(`${CLOUD_API_BASE_URL}/activation/status`);
      url.searchParams.set("installationId", row.installation_id);
      const res = await fetch(url.toString(), {
        headers: { "X-Tenant-Id": row.tenant_id }
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as ActivationCloudResponse;
      await licenseSnapshotRepository.upsert({
        installationId: data.installationId,
        tenantId: data.tenantId,
        planCode: data.planCode,
        planLabel: data.planLabel,
        status: data.status,
        expiresAt: data.expiresAt ?? null,
        offlineGraceUntil: data.offlineGraceUntil ?? null,
        payload: { source: "refresh", at: new Date().toISOString(), planLabel: planLabelFrom(data), cloudMode: getCloudModeLabel() }
      });
      await licenseService.hydrateStoreFromDatabase();
    } catch {
      /* offline ou API indisponível */
    }
  },

  async applySupabasePackageLicense(input: SupabasePackageLicenseInput): Promise<void> {
    const snapshot = resolveSupabasePackageSnapshot(input);

    try {
      await licenseSnapshotRepository.upsert({
        installationId: snapshot.installationId,
        tenantId: snapshot.tenantId,
        planLabel: snapshot.planLabel,
        status: snapshot.status,
        expiresAt: snapshot.expiresAt,
        offlineGraceUntil: snapshot.offlineGraceUntil,
        payload: {
          source: "supabase-auth",
          at: new Date().toISOString(),
          planLabel: snapshot.planLabel,
          packageType: input.packageType,
          email: input.email,
          fullName: input.fullName
        }
      });
    } catch {
      /* em preview sem SQLite segue em memória */
    }

    useLicenseStore.getState().setSnapshot({
      status: snapshot.status,
      planLabel: snapshot.planLabel,
      expiresAt: snapshot.expiresAt,
      offlineGraceUntil: snapshot.offlineGraceUntil,
      installationId: snapshot.installationId,
      source: "supabase-auth"
    });
  }
};
