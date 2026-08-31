/** Maps the authenticated user's highest role to their dashboard route. */
import { ROLES, type Role } from "@/constants";

const PRIORITY: Role[] = [
  ROLES.ADMIN,
  ROLES.TEACHER,
  ROLES.STUDENT_COUNCIL,
  ROLES.DEPARTMENT_STUDENT_LEADER,
  ROLES.STUDENT,
];

const PATH: Record<Role, string> = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.TEACHER]: "/professor",
  [ROLES.STUDENT_COUNCIL]: "/officer",
  [ROLES.DEPARTMENT_STUDENT_LEADER]: "/officer",
  [ROLES.STUDENT]: "/student",
};

const PRIORITY_LOOKUP = new Set<Role>(PRIORITY);

/** Return the highest-priority known role for a set of role names. */
export function getPrimaryRole(roles: string[] | undefined): Role | undefined {
  if (!roles || roles.length === 0) return undefined;
  return PRIORITY.find((role) => roles.includes(role) && PRIORITY_LOOKUP.has(role));
}

/** Return the home dashboard path for a set of role names. */
export function dashboardPathForRoles(roles: string[] | undefined): string {
  const primaryRole = getPrimaryRole(roles);
  return primaryRole ? PATH[primaryRole] : "/dashboard";
}
