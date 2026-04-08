import { CLOUD_API_BASE_URL, SYNC_API_KEY } from "@/config/app";
import type { SyncOutboxRow } from "@/repositories/sync-outbox-repository";
import type { SyncTargetContext } from "@/services/sync/sync-target";

export async function pushSyncBatch(rows: SyncOutboxRow[], ctx: SyncTargetContext): Promise<void> {
  const base = CLOUD_API_BASE_URL.replace(/\/$/, "");
  const url = `${base}/sync/events`;

  const body = {
    events: rows.map((r) => ({
      localId: r.id,
      idempotencyKey: r.idempotency_key,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operation: r.operation,
      payload: JSON.parse(r.payload_json) as Record<string, unknown>,
      createdAt: r.created_at
    }))
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": ctx.tenantId,
    "X-Installation-Id": ctx.installationId
  };
  if (SYNC_API_KEY) {
    headers["X-Api-Key"] = SYNC_API_KEY;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Sync HTTP ${res.status}`);
  }

  await res.json().catch(() => undefined);
}
