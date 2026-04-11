import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/shared/page-loader";
import { useAuthStore } from "@/stores/auth-store";
import { useLicenseStore } from "@/stores/license-store";

interface AuthProtectedRouteProps {
  children: ReactNode;
}

function canEnterWithLegacyLicense(status: string, source: string | null) {
  if (status !== "active" && status !== "grace") {
    return false;
  }

  return source === "local-mode" || source === "activation" || source === "refresh";
}

export function AuthProtectedRoute({ children }: AuthProtectedRouteProps) {
  const location = useLocation();
  const authInitialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.status);
  const licenseStatus = useLicenseStore((state) => state.status);
  const licenseSource = useLicenseStore((state) => state.source);

  if (!authInitialized && authStatus === "loading") {
    return <PageLoader />;
  }

  if (authStatus === "authenticated") {
    if (licenseStatus === "expired") {
      return <Navigate replace state={{ from: location.pathname, reason: "license-expired" }} to="/login" />;
    }

    return <>{children}</>;
  }

  if (canEnterWithLegacyLicense(licenseStatus, licenseSource)) {
    return <>{children}</>;
  }

  return <Navigate replace state={{ from: location.pathname }} to="/login" />;
}
