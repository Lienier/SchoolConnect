/** Navigation config for the Student dashboard. */
import type { NavSection } from "@/layouts/AppShell";

export const studentNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/student" }],
  },
  {
    title: "Engage",
    items: [
      { label: "Browse Events", to: "/events", perm: "events.view" },
      { label: "My Registrations", to: "/registrations/mine", perm: "registrations.view" },
      { label: "Announcements", to: "/announcements", perm: "announcements.view" },
      { label: "Notifications", to: "/notifications", perm: "notifications.view" },
    ],
  },
];
