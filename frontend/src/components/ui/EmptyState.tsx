import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Button } from "./Button";
import {
  Calendar,
  Megaphone,
  ClipboardList,
  QrCode,
  Award,
  History,
  Users,
  Bell,
  School,
  Search,
  UserPlus,
  Plus,
} from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  illustration?: "events" | "announcements" | "registrations" | "attendance" | "certificates" | "history" | "users" | "notifications" | "school" | "default";
}

const illustrations: Record<NonNullable<EmptyStateProps["illustration"]>, ReactNode> = {
  events: <Calendar className="h-16 w-16 text-navy-200" />,
  announcements: <Megaphone className="h-16 w-16 text-navy-200" />,
  registrations: <ClipboardList className="h-16 w-16 text-navy-200" />,
  attendance: <QrCode className="h-16 w-16 text-navy-200" />,
  certificates: <Award className="h-16 w-16 text-navy-200" />,
  history: <History className="h-16 w-16 text-navy-200" />,
  users: <Users className="h-16 w-16 text-navy-200" />,
  notifications: <Bell className="h-16 w-16 text-navy-200" />,
  school: <School className="h-16 w-16 text-navy-200" />,
  default: <Search className="h-16 w-16 text-navy-200" />,
};

export function EmptyState({ title, description, icon, action, className, illustration = "default" }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy-50">
        {icon || illustrations[illustration]}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mb-6 text-navy-500 max-w-sm">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}

export function EmptyStateCard({ title, description, icon, action, className, illustration = "default" }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-navy-100 bg-white p-8 shadow-soft", className)}>
      <EmptyState title={title} description={description} icon={icon} action={action} illustration={illustration} />
    </div>
  );
}

export function NoEventsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyStateCard
      title="No events yet"
      description="Get started by creating your first event. Students will be able to register and you can track attendance."
      illustration="events"
      action={onCreate && <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Create Event</Button>}
    />
  );
}

export function NoAnnouncementsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyStateCard
      title="No announcements"
      description="Create an announcement to share important updates with students and staff."
      illustration="announcements"
      action={onCreate && <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Create Announcement</Button>}
    />
  );
}

export function NoRegistrationsEmptyState() {
  return (
    <EmptyStateCard
      title="No registrations yet"
      description="Students haven't registered for any events. Once they do, you'll see them here."
      illustration="registrations"
    />
  );
}

export function NoAttendanceEmptyState() {
  return (
    <EmptyStateCard
      title="No attendance records"
      description="Scan QR codes at events to record attendance. Records will appear here."
      illustration="attendance"
    />
  );
}

export function NoCertificatesEmptyState() {
  return (
    <EmptyStateCard
      title="No certificates earned"
      description="Complete events and earn certificates. They'll appear here once awarded."
      illustration="certificates"
    />
  );
}

export function NoHistoryEmptyState() {
  return (
    <EmptyStateCard
      title="No participation history"
      description="Your event participation history will appear here once you attend events."
      illustration="history"
    />
  );
}

export function NoUsersEmptyState({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyStateCard
      title="No users found"
      description="Invite users to join your college organization."
      illustration="users"
      action={onInvite && <Button onClick={onInvite}><UserPlus className="mr-2 h-4 w-4" /> Invite Users</Button>}
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyStateCard
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
      illustration="notifications"
    />
  );
}

export function NoSchoolEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyStateCard
      title="No college configured"
      description="Set up your college profile to get started with SchoolConnect."
      illustration="school"
      action={onCreate && <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Setup College</Button>}
    />
  );
}
