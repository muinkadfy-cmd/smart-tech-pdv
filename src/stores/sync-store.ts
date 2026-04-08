import { create } from "zustand";

export interface SyncState {
  pendingCount: number;
  lastSyncAt: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  setOnline: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  bumpPending: (delta: number) => void;
  recordSyncOk: (at: string) => void;
  recordSyncError: (message: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  lastSyncAt: null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  lastError: null,
  setOnline: (v) => set({ isOnline: v }),
  setSyncing: (v) => set({ isSyncing: v }),
  setPendingCount: (n) => set({ pendingCount: Math.max(0, n) }),
  bumpPending: (delta) =>
    set((s) => ({ pendingCount: Math.max(0, s.pendingCount + delta) })),
  recordSyncOk: (at) => set({ lastSyncAt: at, lastError: null, isSyncing: false }),
  recordSyncError: (message) => set({ lastError: message, isSyncing: false })
}));
