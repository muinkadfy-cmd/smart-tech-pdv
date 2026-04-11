import { create } from "zustand";

interface NotificationCenterStoreState {
  readIds: string[];
  markAsRead: (id: string) => void;
  markAllAsRead: (ids: string[]) => void;
  clearReadIds: (activeIds: string[]) => void;
}

const STORAGE_KEY = "smart-tech:notification-read-ids";

function getStoredReadIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function persistReadIds(readIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
}

export const useNotificationCenterStore = create<NotificationCenterStoreState>((set) => ({
  readIds: getStoredReadIds(),
  markAsRead: (id) =>
    set((state) => {
      if (state.readIds.includes(id)) {
        return state;
      }

      const next = [...state.readIds, id];
      persistReadIds(next);
      return {
        readIds: next
      };
    }),
  markAllAsRead: (ids) =>
    set((state) => {
      const next = Array.from(new Set([...state.readIds, ...ids]));
      persistReadIds(next);
      return {
        readIds: next
      };
    }),
  clearReadIds: (activeIds) =>
    set((state) => {
      const next = state.readIds.filter((id) => activeIds.includes(id));
      if (next.length === state.readIds.length) {
        return state;
      }
      persistReadIds(next);
      return {
        readIds: next
      };
    })
}));
