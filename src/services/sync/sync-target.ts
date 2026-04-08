import { getSqliteDatabase } from "@/services/database/sqlite-db";

export interface SyncTargetContext {
  tenantId: string;
  installationId: string;
}

/**
 * Resolve tenant/instalação: primeiro `license_snapshot`, depois variáveis Vite (dev).
 */
export async function resolveSyncTarget(): Promise<SyncTargetContext | null> {
  const db = await getSqliteDatabase();
  if (db) {
    const rows = await db.select<Array<{ tenant_id: string | null; installation_id: string | null }>>(
      "SELECT tenant_id, installation_id FROM license_snapshot LIMIT 1"
    );
    const row = rows[0];
    if (row?.tenant_id && row?.installation_id) {
      return { tenantId: row.tenant_id, installationId: row.installation_id };
    }
  }

  const tenant = import.meta.env.VITE_SYNC_TENANT_ID;
  const installation = import.meta.env.VITE_SYNC_INSTALLATION_ID;
  if (tenant && installation) {
    return { tenantId: tenant, installationId: installation };
  }

  return null;
}
