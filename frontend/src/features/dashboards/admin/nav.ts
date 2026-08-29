/** Navigation config for the Administrator dashboard. */
import type { NavSection } from "@/layouts/AppShell";
import {
  Activity,
  Bell,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export const adminNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: Gauge }],
  },
  {
    title: "Management",
    items: [
      { label: "User Management", to: "/users", perm: "users.view", icon: Users },
      { label: "Roles & Permissions", to: "/roles", perm: "roles.view", icon: ShieldCheck },
      { label: "College Structure", to: "/school", perm: "departments.view", icon: ClipboardList },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Announcements", to: "/announcements", perm: "announcements.view", icon: Megaphone },
      { label: "Events", to: "/events", perm: "events.view", icon: CalendarDays },
      { label: "Registrations", to: "/registrations", perm: "registrations.view", icon: ClipboardList },
      { label: "Attendance", to: "/attendance", perm: "attendance.view", icon: ClipboardCheck },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/reports", perm: "reports.view", icon: BarChart3 },
      { label: "Activity Logs", to: "/audit/logs", perm: "audit.view", icon: Activity },
      { label: "Calendar", to: "/calendar", perm: "events.view", icon: CalendarDays },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Notifications", to: "/notifications", perm: "notifications.view", icon: Bell },
    ],
  },
];
