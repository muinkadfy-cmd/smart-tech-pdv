import { useOperationAlertStore } from "@/stores/operation-alert-store";

export interface AuditLogEntry {
  id: string;
  area: string;
  action: string;
  details: string;
  createdAt: string;
  actorName?: string;
  actorRole?: string;
  actorUserId?: string;
}

const STORAGE_KEY = "smart-tech:audit-log";
const ACTOR_STORAGE_KEY = "smart-tech:audit-actor";
const LIMIT = 80;

function readEntries() {
  if (typeof window === "undefined") {
    return [] as AuditLogEntry[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: AuditLogEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, LIMIT)));
}

function readActor() {
  if (typeof window === "undefined") {
    return null as null | { actorName?: string; actorRole?: string; actorUserId?: string };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTOR_STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      actorName: typeof Reflect.get(parsed, "actorName") === "string" ? String(Reflect.get(parsed, "actorName")) : undefined,
      actorRole: typeof Reflect.get(parsed, "actorRole") === "string" ? String(Reflect.get(parsed, "actorRole")) : undefined,
      actorUserId: typeof Reflect.get(parsed, "actorUserId") === "string" ? String(Reflect.get(parsed, "actorUserId")) : undefined
    };
  } catch {
    return null;
  }
}

export function setAuditActorContext(input: { actorName: string; actorRole: string; actorUserId?: string }) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTOR_STORAGE_KEY, JSON.stringify(input));
}

export function clearAuditActorContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTOR_STORAGE_KEY);
}

export function recordAuditEntry(input: Omit<AuditLogEntry, "id" | "createdAt" | "actorName" | "actorRole" | "actorUserId"> & Partial<Pick<AuditLogEntry, "actorName" | "actorRole" | "actorUserId">>) {
  const actor = readActor();
  const entry: AuditLogEntry = {
    id: `audit-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    actorName: input.actorName ?? actor?.actorName,
    actorRole: input.actorRole ?? actor?.actorRole,
    actorUserId: input.actorUserId ?? actor?.actorUserId,
    ...input
  };

  writeEntries([entry, ...readEntries()]);

  if (typeof window !== "undefined") {
    useOperationAlertStore.getState().push({
      area: entry.area,
      title: entry.action,
      description: entry.details,
      tone: "success"
    });
  }

  return entry;
}

export function getRecentAuditEntries(limit = 12) {
  return readEntries().slice(0, limit);
}

export function getRecentAuditEntriesByArea(area: string, limit = 6) {
  return readEntries()
    .filter((entry) => entry.area === area)
    .slice(0, limit);
}
