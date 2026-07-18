/** Announcements list page with All / Published feed tabs. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { AnnouncementList } from "@/features/announcements/components/AnnouncementList";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";

type Tab = "all" | "feed";

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const { toast } = useToast();
  const { user } = useAuth();
  const canCreate = user?.roles?.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["announcements", tab],
    queryFn: async () => {
      if (tab === "feed") return announcementsApi.feed(1);
      return announcementsApi.list({ page: 1 });
    },
  });

  const items = data?.data ?? [];

  return (
    <main className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-800">Announcements</h1>
          <div className="mt-3 inline-flex rounded-xl border border-navy-200 bg-white p-1">
            <button
              onClick={() => setTab("feed")}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium " +
                (tab === "feed" ? "bg-navy-800 text-white" : "text-navy-700")
              }
            >
              Published
            </button>
            <button
              onClick={() => setTab("all")}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium " +
                (tab === "all" ? "bg-navy-800 text-white" : "text-navy-700")
              }
            >
              All
            </button>
          </div>
        </div>
        {canCreate && (
          <Link to="/announcements/new">
            <Button>New Announcement</Button>
          </Link>
        )}
      </div>

      {isLoading && <p className="text-accent">Loading…</p>}
      {isError && (
        <p className="text-red-600">
          Failed to load announcements. You may lack permission.
        </p>
      )}
      {!isLoading && !isError && <AnnouncementList items={items} />}
    </main>
  );
}
