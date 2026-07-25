/** Announcements list page with Published / All tabs. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { AnnouncementList } from "@/features/announcements/components/AnnouncementList";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Megaphone } from "lucide-react";

type Tab = "feed" | "all";

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("feed");
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
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-navy-800">Announcements</h1>
              <p className="mt-1 text-sm text-navy-500">School-wide announcements and updates</p>
            </div>
            {canCreate && (
              <Link to="/announcements/new">
                <Button>
                  <Megaphone className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </Link>
            )}
          </div>
          <div className="mt-4 inline-flex rounded-xl border border-navy-200 bg-white p-1">
            <button
              onClick={() => setTab("feed")}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium " +
                (tab === "feed" ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-50")
              }
            >
              Published
            </button>
            <button
              onClick={() => setTab("all")}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium " +
                (tab === "all" ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-navy-50")
              }
            >
              All
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {isLoading && <div className="text-center text-navy-500 py-8">Loading…</div>}
        {isError && (
          <div className="text-center text-red-600 py-8">
            Failed to load announcements. You may lack permission.
          </div>
        )}
        {!isLoading && !isError && <AnnouncementList items={items} />}
      </main>
    </div>
  );
}