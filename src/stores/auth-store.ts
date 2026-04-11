import { create } from "zustand";
import type { UserRole } from "@/types/domain";

export type AuthStatus = "loading" | "authenticated" | "anonymous";
export type LicensePackageType = "trial_15d" | "permanent";

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  licensePackage: LicensePackageType;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}

export interface AuthSessionSnapshot {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  user: AuthUserProfile;
}

interface AuthState {
  initialized: boolean;
  status: AuthStatus;
  session: AuthSessionSnapshot | null;
  lastError: string | null;
  setLoading: () => void;
  setSession: (session: AuthSessionSnapshot) => void;
  setAnonymous: () => void;
  setError: (message: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  status: "loading",
  session: null,
  lastError: null,
  setLoading: () => set({ initialized: false, status: "loading", lastError: null }),
  setSession: (session) => set({ initialized: true, status: "authenticated", session, lastError: null }),
  setAnonymous: () => set({ initialized: true, status: "anonymous", session: null, lastError: null }),
  setError: (message) => set({ lastError: message })
}));
