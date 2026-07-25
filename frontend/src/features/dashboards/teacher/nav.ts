/** Navigation config for the Teacher / Event Coordinator dashboard. */
import type { NavSection } from "@/layouts/AppShell";

export const teacherNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/teacher" }],
  },
  {
    title: "Teaching",
    items: [
      { label: "My Events", to: "/events", perm: "events.view" },
      { label: "New Event", to: "/events/new", perm: "events.create" },
      { label: "Registrations", to: "/registrations/mine", perm: "registrations.view" },
      { label: "Announcements", to: "/announcements", perm: "announcements.view" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/reports", perm: "reports.view" },
    ],
  },
];
