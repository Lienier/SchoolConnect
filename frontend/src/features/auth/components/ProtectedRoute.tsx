/** Route guard: redirects unauthenticated users to /login. */
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, requiredPermission, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { can } = usePermissions();
  const user = useAuth().user;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-accent">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  const hasRole = !allowedRoles || (user?.roles ?? []).some((role) => allowedRoles.includes(role));
  if ((requiredPermission && !can(requiredPermission)) || !hasRole) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
