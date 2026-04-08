import { syncOutboxRepository } from "@/repositories/sync-outbox-repository";
import { pushSyncBatch } from "@/services/sync/cloud-sync-client";
import { resolveSyncTarget } from "@/services/sync/sync-target";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { useSyncStore } from "@/stores/sync-store";

const BATCH_LIMIT = 40;

export type SyncCycleResult = "skipped" | "ok" | "error";

/**
 * Motor de sincronização em background: drenar sync_outbox,
 * respeitar idempotency_key, backoff e ordem estável por created_at.
 */
export async function runSyncCycle(): Promise<SyncCycleResult> {
  const store = useSyncStore.getState();
  if (!store.isOnline || store.isSyncing) {
    return "skipped";
  }

  store.setSyncing(true);

  try {
    await syncQueueService.refreshPendingCount();
    const pendingBefore = useSyncStore.getState().pendingCount;
    if (pendingBefore === 0) {
      store.recordSyncOk(new Date().toISOString());
      return "ok";
    }

    const target = await resolveSyncTarget();
    if (!target) {
      store.recordSyncError(
        "Defina tenant/instalacao em license_snapshot ou VITE_SYNC_TENANT_ID / VITE_SYNC_INSTALLATION_ID."
      );
      return "error";
    }

    const rows = await syncOutboxRepository.listPending(BATCH_LIMIT);
    if (rows.length === 0) {
      store.recordSyncOk(new Date().toISOString());
      return "ok";
    }

    await pushSyncBatch(rows, target);

    for (const row of rows) {
      await syncOutboxRepository.markSynced(row.id);
    }

    await syncQueueService.refreshPendingCount();
    store.recordSyncOk(new Date().toISOString());
    return "ok";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro de sincronização";
    store.recordSyncError(message);
    return "error";
  }
}
