/** Navigation config for the Student Council Officer dashboard. */
import type { NavSection } from "@/layouts/AppShell";
import { CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, Gauge, Megaphone, Plus, Users } from "lucide-react";

export const officerNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/officer", icon: Gauge }],
  },
  {
    title: "Management",
    items: [
      { label: "Propose Event", to: "/events/new", perm: "events.create", icon: Plus },
      { label: "My Events", to: "/events", perm: "events.view", icon: CalendarDays },
      { label: "Draft Announcements", to: "/announcements", perm: "announcements.create", icon: Megaphone },
      { label: "My Registrations", to: "/registrations/mine", perm: "registrations.view", icon: ClipboardList },
      { label: "Attendance", to: "/attendance", perm: "attendance.view", icon: ClipboardCheck },
    ],
  },
  {
    title: "Discover",
    items: [
      { label: "Browse Events", to: "/events", perm: "events.view", icon: Users },
      { label: "Announcements", to: "/announcements", perm: "announcements.view", icon: Megaphone },
      { label: "Calendar", to: "/calendar", perm: "events.view", icon: CalendarCheck },
    ],
  },
];
