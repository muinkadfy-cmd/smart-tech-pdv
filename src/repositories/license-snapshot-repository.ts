import { getSqliteDatabase } from "@/services/database/sqlite-db";

export interface LicenseSnapshotRecord {
  installation_id: string;
  tenant_id: string | null;
  plan_code: string | null;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  offline_grace_until: string | null;
  last_validated_at: string | null;
  payload_json: string | null;
}

export interface LicenseSnapshotUpsert {
  installationId: string;
  tenantId: string;
  planCode?: string | null;
  planLabel?: string | null;
  status: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  offlineGraceUntil?: string | null;
  payload?: Record<string, unknown>;
}

export const licenseSnapshotRepository = {
  async load(): Promise<LicenseSnapshotRecord | null> {
    const db = await getSqliteDatabase();
    if (!db) {
      return null;
    }
    const rows = await db.select<LicenseSnapshotRecord[]>("SELECT * FROM license_snapshot LIMIT 1");
    return rows[0] ?? null;
  },

  async upsert(data: LicenseSnapshotUpsert): Promise<void> {
    const db = await getSqliteDatabase();
    if (!db) {
      throw new Error("SQLite indisponivel fora do runtime Tauri.");
    }

    const now = new Date().toISOString();
    const payload = data.payload ?? {
      planLabel: data.planLabel ?? data.planCode
    };

    await db.execute(
      `INSERT INTO license_snapshot (
        installation_id, tenant_id, plan_code, status, activated_at, expires_at, offline_grace_until, last_validated_at, payload_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(installation_id) DO UPDATE SET
        tenant_id = excluded.tenant_id,
        plan_code = excluded.plan_code,
        status = excluded.status,
        activated_at = COALESCE(excluded.activated_at, license_snapshot.activated_at),
        expires_at = excluded.expires_at,
        offline_grace_until = excluded.offline_grace_until,
        last_validated_at = excluded.last_validated_at,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at`,
      [
        data.installationId,
        data.tenantId,
        data.planCode ?? data.planLabel ?? null,
        data.status,
        data.activatedAt ?? now,
        data.expiresAt ?? null,
        data.offlineGraceUntil ?? null,
        now,
        JSON.stringify(payload),
        now
      ]
    );
  }
};
