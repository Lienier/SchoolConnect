/** Navigation config for the Student dashboard. */
import type { NavSection } from "@/layouts/AppShell";
import { Bell, CalendarCheck, CalendarDays, ClipboardList, Gauge, Megaphone, QrCode, UserRound } from "lucide-react";

export const studentNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", to: "/student", icon: Gauge }],
  },
  {
    title: "Engage",
    items: [
      { label: "Browse Events", to: "/events", perm: "events.view", icon: CalendarDays },
      { label: "My Registrations", to: "/registrations/mine", perm: "registrations.view", icon: ClipboardList },
      { label: "Announcements", to: "/announcements", perm: "announcements.view", icon: Megaphone },
      { label: "Notifications", to: "/notifications", perm: "notifications.view", icon: Bell },
      { label: "Calendar", to: "/calendar", perm: "events.view", icon: CalendarCheck },
      { label: "My Attendance", to: "/attendance/mine", perm: "attendance.view", icon: QrCode },
      { label: "Profile", to: "/profile", icon: UserRound },
    ],
  },
];
