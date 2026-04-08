/**
 * Ativacao e validacao de licenca: online quando possivel;
 * snapshot em license_snapshot + tolerancia offline (grace).
 */
import { CLOUD_API_BASE_URL, getCloudModeLabel, isCloudApiConfigured } from "@/config/app";
import { licenseSnapshotRepository } from "@/repositories/license-snapshot-repository";
import type { LicenseStatus } from "@/stores/license-store";
import { useLicenseStore } from "@/stores/license-store";

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
  };
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

export const licenseService = {
  async activateWithKey(activationKey: string): Promise<ActivationResult> {
    const key = activationKey.trim();
    if (key.length < 4) {
      return { ok: false, message: "Informe a chave completa." };
    }

    if (!isCloudApiConfigured()) {
      return { ok: false, message: "Endpoint cloud nao configurado. Use o modo local/offline para liberar a operacao no PC." };
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
        /* Preview no navegador sem Tauri/SQLite: licenca so em memoria nesta sessao */
      }

      return {
        ok: true,
        storePatch: {
          status: mapStatus(data.status),
          planLabel: planLabelFrom(data),
          expiresAt: data.expiresAt ?? null,
          offlineGraceUntil: data.offlineGraceUntil ?? null,
          installationId: data.installationId
        }
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha de rede na ativacao";
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
      /* em preview web sem SQLite, segue apenas em memoria */
    }

    useLicenseStore.getState().setSnapshot({
      status: "active",
      planLabel: "Modo local offline",
      expiresAt: null,
      offlineGraceUntil,
      installationId
    });
  },

  async hydrateStoreFromDatabase(): Promise<void> {
    const row = await licenseSnapshotRepository.load();
    if (!row) {
      return;
    }

    let planLabel = row.plan_code ?? "Modo local";
    if (row.payload_json) {
      try {
        const parsed = JSON.parse(row.payload_json) as { planLabel?: string };
        if (parsed.planLabel) {
          planLabel = String(parsed.planLabel);
        }
      } catch {
        /* ignore */
      }
    }

    useLicenseStore.getState().setSnapshot({
      status: mapStatus(row.status),
      planLabel,
      expiresAt: row.expires_at,
      offlineGraceUntil: row.offline_grace_until,
      installationId: row.installation_id
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
      /* offline ou API indisponivel */
    }
  }
};
