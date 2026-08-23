import { type NavSection } from "@/layouts/AppShell";

import { adminNav } from "./admin/nav";
import { officerNav } from "./officer/nav";
import { studentNav } from "./student/nav";
import { teacherNav } from "./teacher/nav";

export interface DashboardShellConfig {
  title: string;
  nav: NavSection[];
}

const SHELL_BY_ROLE: Record<string, DashboardShellConfig> = {
  admin: { title: "Administrator", nav: adminNav },
  teacher: { title: "Professor", nav: teacherNav },
  student_council: { title: "Student Council", nav: officerNav },
  student: { title: "Student", nav: studentNav },
};

export function getDashboardShellConfig(roles: string[] | undefined): DashboardShellConfig {
  if (!roles || roles.length === 0) {
    return { title: "SchoolConnect", nav: [] };
  }

  if (roles.includes("admin")) return SHELL_BY_ROLE.admin;
  if (roles.includes("teacher")) return SHELL_BY_ROLE.teacher;
  if (roles.includes("student_council")) return SHELL_BY_ROLE.student_council;
  if (roles.includes("student")) return SHELL_BY_ROLE.student;

  return { title: "SchoolConnect", nav: [] };
}
