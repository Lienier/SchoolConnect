/** Navigation config for the Student Council Officer dashboard. */
import type { NavSection } from "@/layouts/AppShell";

export const officerNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/officer" }],
  },
  {
    title: "Student Council",
    items: [
      { label: "Propose Event", to: "/events/new", perm: "events.create" },
      { label: "My Events", to: "/events", perm: "events.view" },
      { label: "Draft Announcements", to: "/announcements", perm: "announcements.create" },
      { label: "My Registrations", to: "/registrations/mine", perm: "registrations.view" },
    ],
  },
  {
    title: "Discover",
    items: [
      { label: "Browse Events", to: "/events", perm: "events.view" },
      { label: "Announcements", to: "/announcements", perm: "announcements.view" },
    ],
  },
];
