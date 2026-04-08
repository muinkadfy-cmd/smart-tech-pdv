import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useLicenseStore } from "@/stores/license-store";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Proteção de rotas sensíveis por status de licença (cache local).
 * PDV e vendas permanecem disponíveis em modo grace conforme regra de negócio.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const status = useLicenseStore((s) => s.status);
  if (status === "expired") {
    return <Navigate replace to="/ativacao" />;
  }
  return <>{children}</>;
}
