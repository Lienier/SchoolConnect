import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, BellRing, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

export interface AlertAnnouncement {
  id: string;
  title: string;
  body: string;
  priority?: "urgent" | "important" | "normal" | null;
  is_pinned?: boolean;
  author_name?: string | null;
  created_at: string;
  is_emergency?: boolean;
}

export interface HeroAlertBannerProps {
  announcements: AlertAnnouncement[];
}

const PRIORITY_STYLES: Record<NonNullable<AlertAnnouncement["priority"]>, string> = {
  urgent: "from-rose-600 via-orange-500 to-amber-400",
  important: "from-sky-600 via-navy-800 to-slate-900",
  normal: "from-navy-700 via-slate-700 to-slate-900",
};

function getRelativeTime(dateString: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function HeroAlertBanner({ announcements }: HeroAlertBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((value) => (value + 1) % announcements.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  const current = announcements[currentIndex];

  const severity = useMemo(() => {
    if (!current) return "normal";
    if (current.is_emergency || current.priority === "urgent") return "urgent";
    if (current.priority === "important") return "important";
    return "normal";
  }, [current]);

  if (!current) return null;

  return (
    <Card className={cn("overflow-hidden border-0 p-0 shadow-xl", `bg-gradient-to-r ${PRIORITY_STYLES[severity]} text-white`)}>
      <div className="relative overflow-hidden px-5 py-6 sm:px-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute left-0 bottom-0 h-36 w-36 rounded-full bg-white/80 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <BellRing className="h-3.5 w-3.5" />
              {severity === "urgent" ? "Emergency bulletin" : "Pinned bulletin"}
            </div>

            <div className="mt-4 flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {current.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                  {current.body}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/75">
                  <Badge tone="danger" className="bg-white/15 text-white">
                    {severity === "urgent" ? "Urgent" : "Important"}
                  </Badge>
                  {current.author_name && <span>By {current.author_name}</span>}
                  <span>•</span>
                  <span>{getRelativeTime(current.created_at)}</span>
                  {current.is_pinned && (
                    <>
                      <span>•</span>
                      <span>Pinned by the office</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/announcements">
              <Button variant="secondary" className="bg-white text-navy-900 hover:bg-white/90">
                Open bulletin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            {announcements.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((value) => (value - 1 + announcements.length) % announcements.length)
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Previous alert"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex gap-2">
                  {announcements.map((announcement, index) => (
                    <button
                      key={announcement.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        index === currentIndex ? "w-8 bg-white" : "w-2.5 bg-white/45",
                      )}
                      aria-label={`Show alert ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((value) => (value + 1) % announcements.length)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Next alert"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
