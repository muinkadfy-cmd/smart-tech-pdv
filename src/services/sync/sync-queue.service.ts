/**
 * Fila local de eventos para sincronização com a API cloud.
 * Enfileira operações de domínio; o sync-engine consome em background.
 */
import { syncOutboxRepository } from "@/repositories/sync-outbox-repository";
import { useSyncStore } from "@/stores/sync-store";
import type { EnqueueInput } from "@/types/sync";

export type { EnqueueInput, OutboxOperation } from "@/types/sync";

async function refreshStoreCount() {
  const n = await syncOutboxRepository.countPending();
  useSyncStore.getState().setPendingCount(n);
}

export const syncQueueService = {
  async enqueue(input: EnqueueInput): Promise<void> {
    await syncOutboxRepository.enqueue(input);
    await refreshStoreCount();
  },

  async pendingCount(): Promise<number> {
    return syncOutboxRepository.countPending();
  },

  async refreshPendingCount(): Promise<void> {
    await refreshStoreCount();
  }
};
