import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter, Megaphone, Search, Sparkles, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/context/AuthContext";
import { feedApi } from "@/features/announcements/services/feedApi";
import { HeroAlertBanner } from "@/features/announcements/components/HeroAlertBanner";
import { SocialFeedCard } from "@/features/announcements/components/SocialFeedCard";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/utils/cn";

type FeedTab = "all" | "announcements" | "events" | "pinned";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "all", label: "All Updates" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Upcoming Events" },
  { id: "pinned", label: "Pinned" },
];

export function BulletinFeed({
  title = "College Bulletin",
  description = "A social-style feed for announcements and events.",
  compact = false,
  showHero = true,
  showHeader = false,
  className,
  defaultTab = "all",
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  showHero?: boolean;
  showHeader?: boolean;
  className?: string;
  defaultTab?: FeedTab;
}) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<FeedTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed", "public", defaultTab],
    queryFn: () => feedApi.list({ kind: "all", limit: compact ? 6 : 12 }),
  });

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const alerts = useMemo(
    () =>
      items.filter(
        (item) =>
          item.type === "announcement" &&
          (item.is_emergency || item.is_pinned || item.priority === "urgent"),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab === "announcements" && item.type !== "announcement") return false;
      if (activeTab === "events" && item.type !== "event") return false;
      if (activeTab === "pinned" && !item.is_pinned && !item.is_emergency) return false;
      if (q) {
        const haystack = [
          item.title,
          item.body,
          item.author_name,
          item.category,
          item.location,
          ...(item.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeTab, items, searchQuery]);

  const canCreateAnnouncement = can("announcements.create");
  const canCreateEvent = can("events.create");

  return (
    <section className={cn("space-y-6", className)}>
      {showHeader && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-navy-900 via-navy-800 to-sky-900 p-0 text-white shadow-xl">
          <div className="relative overflow-hidden px-5 py-6 sm:px-8">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-sky-400 blur-3xl" />
              <div className="absolute left-0 top-8 h-32 w-32 rounded-full bg-emerald-400 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live bulletin stream
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canCreateAnnouncement && (
                  <Link to="/announcements/new">
                    <Button variant="secondary" className="border-white/20 bg-white text-navy-900 hover:bg-white/90">
                      <Megaphone className="mr-2 h-4 w-4" />
                      New Announcement
                    </Button>
                  </Link>
                )}
                {canCreateEvent && (
                  <Link to="/events/new">
                    <Button variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      Propose Event
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {showHero && alerts.length > 0 && <HeroAlertBanner announcements={alerts} />}

      <div className="rounded-3xl border border-navy-100 bg-white/90 p-4 shadow-card backdrop-blur dark:border-navy-800 dark:bg-navy-950/70 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-navy-900 text-white shadow-md dark:bg-white dark:text-navy-900"
                    : "bg-navy-100 text-navy-600 hover:bg-navy-200 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!compact && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, author, venue, category..."
                  className="h-11 w-full rounded-2xl border border-navy-200 bg-white pl-10 pr-4 text-sm text-navy-900 outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-200 dark:border-navy-800 dark:bg-navy-950 dark:text-white"
                />
              </div>
              <div className="hidden items-center gap-2 rounded-2xl border border-navy-200 px-3 py-2 text-sm text-navy-500 dark:border-navy-800 dark:text-navy-400 md:inline-flex">
                <Filter className="h-4 w-4" />
                {filteredItems.length} posts
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="animate-pulse p-0">
              <div className="h-1 bg-navy-200" />
              <div className="p-6">
                <div className="h-4 w-48 rounded-full bg-navy-100" />
                <div className="mt-4 h-6 w-3/4 rounded-full bg-navy-100" />
                <div className="mt-3 h-4 w-full rounded-full bg-navy-100" />
                <div className="mt-2 h-4 w-11/12 rounded-full bg-navy-100" />
              </div>
              <div className="h-64 bg-navy-100" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border border-rose-200 bg-rose-50 text-rose-800">
          Could not load the bulletin feed right now.
        </Card>
      )}

      {!isLoading && !isError && filteredItems.length === 0 && (
        <Card className="border-dashed border-navy-200 bg-white text-center text-navy-500 dark:border-navy-800 dark:bg-navy-950 dark:text-navy-400">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-100 text-navy-600 dark:bg-navy-900 dark:text-navy-300">
            <Megaphone className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-navy-900 dark:text-white">
            No bulletin posts match this view
          </h2>
          <p className="mt-2 text-sm">
            Try another tab or search term. {user ? "Your feed updates automatically as new posts arrive." : "Sign in to see a more personalized stream."}
          </p>
        </Card>
      )}

      {!isLoading && !isError && filteredItems.length > 0 && (
        <div className={cn("space-y-5", compact && "space-y-4")}>
          {filteredItems.map((item) => (
            <SocialFeedCard key={item.id} item={item} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}
