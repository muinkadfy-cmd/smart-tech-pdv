import { create } from "zustand";
import type { OperationFocus } from "@/types/domain";

interface AppShellState {
  sidebarCollapsed: boolean;
  productViewMode: "table" | "cards";
  operationFocus: OperationFocus;
  toggleSidebar: () => void;
  setProductViewMode: (mode: "table" | "cards") => void;
  setOperationFocus: (mode: OperationFocus) => void;
}

const STORAGE_KEY = "smart-tech:operation-focus";

function getStoredFocus(): OperationFocus {
  if (typeof window === "undefined") {
    return "geral";
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "calcados" || value === "roupas" ? value : "geral";
}

export const useAppShellStore = create<AppShellState>((set) => ({
  sidebarCollapsed: false,
  productViewMode: "table",
  operationFocus: getStoredFocus(),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setProductViewMode: (mode) => set({ productViewMode: mode }),
  setOperationFocus: (mode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    set({ operationFocus: mode });
  }
}));
