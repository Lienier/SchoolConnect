/**
 * Permission helper derived from the authenticated user's roles.
 *
 * Mirrors the backend role -> permission mapping so the UI can show/hide
 * actions without a server round-trip. For custom roles created at runtime,
 * it fetches the role catalog once and merges their permissions.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { rolesApi } from "@/features/roles/services/rolesApi";
import { useAuth } from "@/features/auth/context/AuthContext";

// Keep in sync with backend app/permissions/constants.py DEFAULT_ROLE_PERMISSIONS.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  teacher: [
    "announcements.view",
    "announcements.create",
    "announcements.update",
    "announcements.delete",
    "events.view",
    "events.create",
    "events.update",
    "events.delete",
    "registrations.view",
    "registrations.approve",
    "registrations.manage",
    "attendance.view",
    "attendance.manage",
    "attendance.scan",
    "notifications.view",
    "reports.view",
    "departments.view",
    "courses.view",
    "sections.view",
    "organizations.view",
    "academic_years.view",
    "semesters.view",
  ],
  student_council: [
    "announcements.view",
    "announcements.create",
    "announcements.update",
    "events.view",
    "events.create",
    "events.update",
    "registrations.view",
    "registrations.manage",
    "attendance.view",
    "notifications.view",
    "reports.view",
    "departments.view",
    "courses.view",
    "sections.view",
    "organizations.view",
    "academic_years.view",
    "semesters.view",
  ],
  department_student_leader: [
    "announcements.view",
    "announcements.create",
    "events.view",
    "events.create",
    "events.update",
    "registrations.view",
    "registrations.manage",
    "attendance.view",
    "attendance.scan",
    "notifications.view",
    "reports.view",
    "departments.view",
    "courses.view",
    "sections.view",
    "organizations.view",
    "academic_years.view",
    "semesters.view",
  ],
  student: [
    "announcements.view",
    "events.view",
    "registrations.view",
    "registrations.create",
    "attendance.view",
    "notifications.view",
    "departments.view",
    "courses.view",
    "sections.view",
    "organizations.view",
    "academic_years.view",
    "semesters.view",
  ],
};

export function usePermissions() {
  const { user } = useAuth();
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  // Fetch role catalog (including custom roles) to resolve non-system roles.
  const { data: roleCatalog } = useQuery({
    queryKey: ["roles", "catalog"],
    queryFn: () => rolesApi.list({ page: 1 }),
    enabled: roles.some((r) => !(r in ROLE_PERMISSIONS)),
  });

  return useMemo(() => {
    const perms = new Set<string>();
    for (const role of roles) {
      if (role === "admin") {
        perms.add("*");
        continue;
      }
      const builtin = ROLE_PERMISSIONS[role];
      if (builtin) {
        builtin.forEach((p) => perms.add(p));
        continue;
      }
      // Custom role: look up its granted permissions from the catalog.
      const custom = roleCatalog?.data.find((r) => r.name === role);
      if (custom && custom.permissions) custom.permissions.forEach((p: string) => perms.add(p));
    }

    const has = (perm: string) => perms.has("*") || perms.has(perm);
    return {
      permissions: perms,
      can: has,
      canAny: (permsList: string[]) =>
        perms.has("*") || permsList.some((p) => perms.has(p)),
      canAll: (permsList: string[]) =>
        perms.has("*") || permsList.every((p) => perms.has(p)),
    };
  }, [roles, roleCatalog]);
}
