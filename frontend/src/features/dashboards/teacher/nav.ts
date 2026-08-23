/** Navigation config for the Professor / Event Coordinator dashboard. */
import type { NavSection } from "@/layouts/AppShell";
import { BarChart3, CalendarCheck, CalendarDays, ClipboardCheck, Gauge, Megaphone, Plus } from "lucide-react";

export const teacherNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/professor", icon: Gauge }],
  },
  {
    title: "Teaching",
    items: [
      { label: "My Events", to: "/events", perm: "events.view", icon: CalendarDays },
      { label: "New Event", to: "/events/new", perm: "events.create", icon: Plus },
      { label: "Attendance", to: "/attendance", perm: "attendance.view", icon: ClipboardCheck },
      { label: "Announcements", to: "/announcements", perm: "announcements.view", icon: Megaphone },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/reports", perm: "reports.view", icon: BarChart3 },
      { label: "Calendar", to: "/calendar", perm: "events.view", icon: CalendarCheck },
    ],
  },
];
