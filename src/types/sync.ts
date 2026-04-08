export type OutboxOperation = "create" | "update" | "delete";

export interface EnqueueInput {
  entityType: string;
  entityId?: string;
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}
