/** Event card with student-friendly event and registration context. */
import { type ReactNode } from "react";
import { Calendar, Clock, MapPin, Shield, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

interface EventCardProps {
  title: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  isTeamEvent?: boolean;
  maxTeamSize?: number;
  registrationDeadline?: string | null;
  approvalRequired?: boolean;
  status?: string;
  priority?: "normal" | "important" | "urgent";
  category?: string | null;
  actions?: ReactNode;
  className?: string;
}

export function EventCard({
  title,
  description,
  startDate,
  endDate,
  location,
  capacity,
  registeredCount,
  isTeamEvent,
  maxTeamSize,
  registrationDeadline,
  approvalRequired,
  status = "approved",
  priority = "normal",
  category,
  actions,
  className,
}: EventCardProps) {
  const dateLabel = startDate
    ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "TBD";
  const timeLabel = startDate
    ? `${new Date(startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${endDate ? ` - ${new Date(endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}`
    : "Time to be announced";

  return (
    <Card className={cn("flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-soft", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-navy-900 dark:text-white">{title}</h3>
            {category && <Badge tone="neutral" className="text-xs">{category}</Badge>}
          </div>
          {description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-navy-500 dark:text-navy-300">{description}</p>}
        </div>
        <Badge tone={status === "approved" || status === "ongoing" ? "success" : status === "cancelled" ? "danger" : "info"} className="shrink-0 text-xs">
          {status.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-navy-600 dark:text-navy-300">
        <Info icon={Calendar} primary={dateLabel} secondary={timeLabel} />
        {location && <Info icon={MapPin} primary={location} />}
        <div className="grid gap-3 sm:grid-cols-2">
          {capacity ? (
            <Info icon={Users} primary={`${registeredCount ?? 0} / ${capacity}`} secondary="Seats filled" />
          ) : (
            <Info icon={Users} primary="Open capacity" secondary="No seat limit" />
          )}
          {isTeamEvent && (
            <Info icon={Shield} primary="Team event" secondary={maxTeamSize ? `Up to ${maxTeamSize} members` : "Team registration"} />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {registrationDeadline && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            Deadline {new Date(registrationDeadline).toLocaleDateString()}
          </span>
        )}
        {approvalRequired && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            <Shield className="h-3.5 w-3.5" />
            Approval required
          </span>
        )}
        {priority !== "normal" && <Badge tone={priority === "urgent" ? "danger" : "warning"}>{priority}</Badge>}
      </div>

      {actions && <div className="mt-auto flex justify-end gap-2 pt-4">{actions}</div>}
    </Card>
  );
}

function Info({
  icon: Icon,
  primary,
  secondary,
}: {
  icon: typeof Calendar;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-navy-400" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-navy-800 dark:text-white">{primary}</span>
        {secondary && <span className="block truncate text-xs text-navy-500 dark:text-navy-400">{secondary}</span>}
      </span>
    </div>
  );
}
