import { create } from "zustand";

export type LicenseStatus = "active" | "grace" | "expired" | "unknown";

export interface LicenseState {
  status: LicenseStatus;
  planLabel: string;
  expiresAt: string | null;
  offlineGraceUntil: string | null;
  installationId: string | null;
  source: string | null;
  setSnapshot: (partial: Partial<LicenseState>) => void;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  status: "unknown",
  planLabel: "—",
  expiresAt: null,
  offlineGraceUntil: null,
  installationId: null,
  source: null,
  setSnapshot: (partial) => set(partial)
}));
