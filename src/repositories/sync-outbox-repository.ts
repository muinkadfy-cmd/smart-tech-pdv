import { getSqliteDatabase } from "@/services/database/sqlite-db";
import type { EnqueueInput } from "@/types/sync";

export interface SyncOutboxRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  operation: string;
  payload_json: string;
  idempotency_key: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export const syncOutboxRepository = {
  async enqueue(input: EnqueueInput): Promise<boolean> {
    const db = await getSqliteDatabase();
    if (!db) {
      return false;
    }

    const id = `o-${crypto.randomUUID()}`;
    await db.execute(
      `INSERT OR IGNORE INTO sync_outbox (
        id, entity_type, entity_id, operation, payload_json, idempotency_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        input.entityType,
        input.entityId ?? null,
        input.operation,
        JSON.stringify(input.payload),
        input.idempotencyKey
      ]
    );

    const check = await db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM sync_outbox WHERE idempotency_key = ?",
      [input.idempotencyKey]
    );
    return Number(check[0]?.c ?? 0) > 0;
  },

  async countPending(): Promise<number> {
    const db = await getSqliteDatabase();
    if (!db) {
      return 0;
    }
    const rows = await db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM sync_outbox WHERE status = 'pending'"
    );
    return Number(rows[0]?.c ?? 0);
  },

  async listPending(limit: number): Promise<SyncOutboxRow[]> {
    const db = await getSqliteDatabase();
    if (!db) {
      return [];
    }
    const rows = await db.select<SyncOutboxRow[]>(
      "SELECT * FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
      [limit]
    );
    return rows ?? [];
  },

  async markSynced(id: string): Promise<void> {
    const db = await getSqliteDatabase();
    if (!db) {
      return;
    }
    await db.execute(
      "UPDATE sync_outbox SET status = 'synced', last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const db = await getSqliteDatabase();
    if (!db) {
      return;
    }
    await db.execute(
      `UPDATE sync_outbox SET
        attempt_count = attempt_count + 1,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [errorMessage.slice(0, 2000), id]
    );
  }
};
