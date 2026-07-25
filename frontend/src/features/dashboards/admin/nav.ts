/** Navigation config for the Administrator dashboard. */
import type { NavSection } from "@/layouts/AppShell";

export const adminNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/admin" }],
  },
  {
    title: "Management",
    items: [
      { label: "Users", to: "/users", perm: "users.view" },
      { label: "Roles & Permissions", to: "/roles", perm: "roles.view" },
      { label: "School Structure", to: "/school", perm: "departments.view" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Announcements", to: "/announcements", perm: "announcements.view" },
      { label: "Events", to: "/events", perm: "events.view" },
      { label: "Registrations", to: "/registrations/mine", perm: "registrations.view" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/reports", perm: "reports.view" },
      { label: "Audit Logs", to: "/audit/logs", perm: "audit.view" },
    ],
  },
];
