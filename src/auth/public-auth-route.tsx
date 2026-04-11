import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PageLoader } from "@/components/shared/page-loader";
import { useAuthStore } from "@/stores/auth-store";

interface PublicAuthRouteProps {
  children: ReactNode;
}

export function PublicAuthRoute({ children }: PublicAuthRouteProps) {
  const authStatus = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized && authStatus === "loading") {
    return <PageLoader />;
  }

  if (initialized && authStatus === "authenticated") {
    return <Navigate replace to="/dashboard" />;
  }

  return <>{children}</>;
}
