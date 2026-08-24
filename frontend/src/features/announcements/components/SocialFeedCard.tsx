import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Megaphone,
  Ticket,
  Users2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiClient } from "@/api/client";
import { API_BASE_URL } from "@/constants";
import type { AnnouncementAttachment } from "@/features/announcements/types";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/utils/cn";
import type { FeedItem } from "@/features/announcements/types/feed";

export interface SocialFeedCardProps {
  item: FeedItem;
  className?: string;
  compact?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Professor",
  student_council: "Student Council",
  student: "Student",
};

const ROLE_BADGE: Record<string, "danger" | "info" | "warning" | "success"> = {
  admin: "danger",
  teacher: "info",
  student_council: "warning",
  student: "success",
};

function getInitials(name: string | null | undefined) {
  if (!name) return "SC";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildCalendarUrl(item: FeedItem) {
  if (!item.start_time) return null;
  const start = new Date(item.start_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = item.end_time
    ? new Date(item.end_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : start;
  const details = item.body ? item.body.slice(0, 200) : item.title;
  const location = item.location ?? "";

  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(item.title)}` +
    `&dates=${start}/${end}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(location)}`
  );
}

function isImageAttachment(attachment: AnnouncementAttachment) {
  return Boolean(attachment.content_type?.startsWith("image/"));
}

function resolveUploadUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api")) {
    const base = API_BASE_URL.endsWith("/api") ? API_BASE_URL.slice(0, -4) : "";
    return `${base}${url}`;
  }
  return url;
}

function apiPathFromUploadUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/api/")) return url.slice(4);
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/api/") ? parsed.pathname.slice(4) : null;
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SocialFeedCard({ item, className, compact = false }: SocialFeedCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaObjectUrl, setMediaObjectUrl] = useState<{ source: string; url: string } | null>(null);

  const roleLabel = ROLE_LABELS[item.author_role ?? ""] ?? "School";
  const roleTone: "danger" | "info" | "warning" | "success" =
    ROLE_BADGE[item.author_role ?? ""] ?? "info";
  const sharePath = item.type === "event" ? `/events/${item.id}` : `/announcements#feed-${item.id}`;

  const copiedTitle = useMemo(
    () => `${item.type === "event" ? "Event" : "Announcement"} link copied`,
    [item.type],
  );

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast(copiedTitle, "success");
    } catch {
      toast("Could not copy the link right now.", "error");
    }
  };

  const openPrimary = () => {
    if (item.type === "event") {
      navigate(user ? `/events/${item.id}` : "/login");
      return;
    }
    navigate("/announcements");
  };

  const addToCalendar = () => {
    const url = buildCalendarUrl(item);
    if (!url) {
      toast("This item does not have a schedule yet.", "warning");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isLong = item.body.length > 180;
  const body = expanded || !isLong ? item.body : `${item.body.slice(0, 180).trimEnd()}…`;
  const attachments = item.attachments ?? [];
  const imageAttachments = attachments.filter(isImageAttachment);
  const documentAttachments = attachments.filter((attachment) => !isImageAttachment(attachment));
  const primaryImageUrl = resolveUploadUrl(item.banner_url) ?? resolveUploadUrl(imageAttachments[0]?.url);
  const protectedMediaPath = apiPathFromUploadUrl(primaryImageUrl);
  const mediaUrl = protectedMediaPath
    ? mediaObjectUrl?.source === primaryImageUrl ? mediaObjectUrl.url : null
    : primaryImageUrl;
  const hasMedia = Boolean(primaryImageUrl);
  const capacityPercent =
    item.type === "event" && item.capacity && item.registered_count !== null && item.registered_count !== undefined
      ? Math.min(100, Math.round((item.registered_count / item.capacity) * 100))
      : null;

  useEffect(() => {
    const apiPath = apiPathFromUploadUrl(primaryImageUrl);
    if (!apiPath || !primaryImageUrl) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    apiClient
      .get(apiPath, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setMediaObjectUrl({ source: primaryImageUrl, url: objectUrl });
      })
      .catch(() => setMediaObjectUrl(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [primaryImageUrl]);

  const downloadAttachment = async (attachment: AnnouncementAttachment) => {
    const apiPath = apiPathFromUploadUrl(resolveUploadUrl(attachment.url));
    if (!apiPath) {
      toast("This attachment cannot be downloaded right now.", "error");
      return;
    }
    try {
      const response = await apiClient.get(apiPath, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.original_name ?? attachment.filename ?? "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast("Could not download this attachment.", "error");
    }
  };

  return (
    <Card
      id={`feed-${item.id}`}
      className={cn(
        "group overflow-hidden border border-navy-100 bg-white p-0 shadow-sm transition-colors hover:border-blue-200 dark:border-navy-800 dark:bg-navy-950 dark:shadow-none dark:hover:border-blue-900",
        className,
      )}
    >
      <div className="border-b border-navy-100 bg-white px-4 py-4 dark:border-navy-800 dark:bg-navy-950 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-100 text-sm font-semibold text-navy-700 dark:bg-navy-800 dark:text-white">
            {item.author_avatar ? (
              <img src={item.author_avatar} alt={item.author_name ?? "Author"} className="h-full w-full object-cover" />
            ) : (
              getInitials(item.author_name)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-navy-900 dark:text-white">
                {item.author_name ?? "SchoolConnect"}
              </p>
              <Badge tone={item.type === "event" ? "info" : "neutral"} className="shrink-0">
                {item.type === "event" ? "Event" : "Announcement"}
              </Badge>
              <Badge tone={roleTone} className="shrink-0">
                {roleLabel}
              </Badge>
              {item.category && (
                <Badge tone="neutral" className="shrink-0 bg-navy-100 text-navy-700">
                  {item.category}
                </Badge>
              )}
              {item.priority === "urgent" && (
                <Badge tone="danger" className="shrink-0">
                  Urgent
                </Badge>
              )}
              {item.is_pinned && (
                <Badge tone="warning" className="shrink-0">
                  Pinned
                </Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-500 dark:text-navy-400">
              <span>{getRelativeTime(item.created_at)}</span>
              <span>/</span>
              <span>{item.type === "event" ? "Event bulletin" : "Announcement bulletin"}</span>
              {item.is_team_event && (
                <>
                  <span>/</span>
                  <span>Team event</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-4 py-4 dark:bg-navy-950 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-400">Caption</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-navy-900 dark:text-white">
              {item.title}
            </h3>
            {item.type === "announcement" && item.target_audience?.length ? (
              <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">
                Audience: {item.target_audience.join(", ")}
              </p>
            ) : null}
          </div>

          {hasMedia && <Badge tone="neutral" className="shrink-0">Media</Badge>}
        </div>

        <p
          className={cn(
            "mt-3 text-sm leading-6 text-navy-600 dark:text-navy-300",
            compact ? "line-clamp-2" : "line-clamp-5",
          )}
        >
          {body}
        </p>

        {isLong && !compact && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-600 dark:text-blue-300"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {item.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.slice(0, compact ? 3 : 6).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-lg bg-navy-100 px-3 py-1 text-xs font-medium text-navy-600 dark:bg-navy-900 dark:text-navy-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {hasMedia && (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative block w-full cursor-zoom-in overflow-hidden border-y border-navy-100 bg-navy-950 text-left dark:border-navy-800"
        >
          <>
            <img
              src={mediaUrl ?? ""}
              alt={item.title}
              className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
          </>
        </button>
      )}

      {hasMedia && lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          role="presentation"
        >
          <div className="relative max-h-[90vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <img
              src={mediaUrl ?? ""}
              alt={item.title}
              className="max-h-[90vh] rounded-3xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-900 shadow-lg transition-transform hover:scale-105"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {item.type === "event" && (
        <div className="border-t border-navy-100 bg-navy-50 px-4 py-4 dark:border-navy-800 dark:bg-navy-900/30 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-400">Event details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-navy-100 dark:bg-navy-950 dark:ring-navy-800 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Date & Time</p>
              <p className="mt-1 text-sm font-medium text-navy-900 dark:text-white">
                {formatDateTime(item.start_time)}
              </p>
              {item.end_time && (
                <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">
                  Ends {formatDateTime(item.end_time)}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-navy-100 dark:bg-navy-950 dark:ring-navy-800 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Venue</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-white">
                <MapPin className="h-4 w-4 text-rose-500" />
                {item.location ?? "TBA"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.registration_deadline && (
              <Badge tone="danger" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Deadline {formatDateTime(item.registration_deadline)}
              </Badge>
            )}
            {item.max_team_size ? (
              <Badge tone="neutral" className="gap-1 bg-navy-100 text-navy-700">
                <Users2 className="h-3.5 w-3.5" />
                Max team {item.max_team_size}
              </Badge>
            ) : null}
            {item.approval_required ? (
              <Badge tone="warning" className="gap-1">
                <Ticket className="h-3.5 w-3.5" />
                Approval required
              </Badge>
            ) : null}
          </div>

          {capacityPercent !== null && item.capacity ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-navy-500">
                <span>Capacity</span>
                <span>
                  {item.registered_count ?? 0} / {item.capacity}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-200 dark:bg-navy-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    capacityPercent >= 90
                      ? "bg-rose-500"
                      : capacityPercent >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {documentAttachments.length > 0 && (
        <div className="border-t border-navy-100 px-4 py-4 dark:border-navy-800 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-400">Attachments</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {documentAttachments.map((attachment) => {
              const name = attachment.original_name ?? attachment.filename ?? "Attachment";
              return (
                <button
                  type="button"
                  key={attachment.id}
                  onClick={() => downloadAttachment(attachment)}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-navy-100 bg-navy-50 px-3 py-3 text-sm transition hover:bg-navy-100 dark:border-navy-800 dark:bg-navy-900/50 dark:hover:bg-navy-900"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm dark:bg-navy-950">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy-900 dark:text-white">{name}</span>
                    <span className="text-xs text-navy-500">{formatFileSize(attachment.size_bytes)}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-navy-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-navy-100 bg-slate-50 px-4 py-4 dark:border-navy-800 dark:bg-navy-900/40 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-400">Actions</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={openPrimary} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {item.type === "event" ? (user ? "Register now" : "View event") : "Open bulletin"}
            </Button>
            <Button variant="secondary" size="sm" onClick={copyLink} className="gap-2">
              <Copy className="h-4 w-4" />
              Share
            </Button>
          </div>

          {item.type === "event" ? (
            <Button size="sm" onClick={addToCalendar} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Add to calendar
            </Button>
          ) : (
            <Link to="/announcements" className="inline-flex">
              <Button size="sm" className="gap-2">
                <Megaphone className="h-4 w-4" />
                View all announcements
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
