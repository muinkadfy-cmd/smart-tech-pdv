import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/shared/page-loader";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import { canAccessNavigationItem, getDefaultRole, getProfileHomePath, getRoleHomePath, hasRoleAccess, resolveActiveLocalUserProfile } from "@/lib/access-control";
import { navigationItems } from "@/routes/navigation";
import type { UserRole } from "@/types/domain";

interface RoleProtectedRouteProps {
  children: ReactNode;
  minRole: UserRole;
}

export function RoleProtectedRoute({ children, minRole }: RoleProtectedRouteProps) {
  const location = useLocation();
  const { data, loading } = useSettingsSnapshot();

  if (loading) {
    return <PageLoader />;
  }

  const currentRole = data?.currentUserRole ?? getDefaultRole();
  const activeLocalUser = data ? resolveActiveLocalUserProfile(data.localUsers, data.activeLocalUserId) : null;
  const matchedNavigationItem = navigationItems.find((item) => item.path === location.pathname);
  const fallbackPath = matchedNavigationItem ? getProfileHomePath(navigationItems, currentRole, activeLocalUser) : getRoleHomePath(currentRole);
  const hasCustomNavigationOverride = Boolean(matchedNavigationItem && activeLocalUser?.permissionMode === "custom");

  if (matchedNavigationItem && !canAccessNavigationItem(matchedNavigationItem, currentRole, activeLocalUser)) {
    return <Navigate replace to={fallbackPath} />;
  }

  if (!hasCustomNavigationOverride && !hasRoleAccess(currentRole, minRole)) {
    return <Navigate replace to={fallbackPath} />;
  }

  return <>{children}</>;
}
