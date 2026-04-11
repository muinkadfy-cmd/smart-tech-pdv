import { create } from "zustand";

export type OperationAlertTone = "success" | "info" | "warning" | "error";

export interface OperationAlertItem {
  id: string;
  title: string;
  description: string;
  tone: OperationAlertTone;
  area?: string;
  createdAt: string;
}

interface OperationAlertStoreState {
  items: OperationAlertItem[];
  push: (item: Omit<OperationAlertItem, "id" | "createdAt">) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useOperationAlertStore = create<OperationAlertStoreState>((set) => ({
  items: [],
  push: (item) => {
    const nextId = `op-alert-${crypto.randomUUID()}`;
    const nextItem: OperationAlertItem = {
      id: nextId,
      createdAt: new Date().toISOString(),
      ...item
    };

    set((state) => ({
      items: [nextItem, ...state.items].slice(0, 5)
    }));

    return nextId;
  },
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    })),
  clear: () => set({ items: [] })
}));
