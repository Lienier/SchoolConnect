import { Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getDashboardShellConfig } from "@/features/dashboards/shellConfig";

import { AppShell } from "./AppShell";

export function AuthenticatedLayout() {
  const { user } = useAuth();
  const shellConfig = getDashboardShellConfig(user?.roles);

  return (
    <AppShell title={shellConfig.title} nav={shellConfig.nav}>
      <Outlet />
    </AppShell>
  );
}