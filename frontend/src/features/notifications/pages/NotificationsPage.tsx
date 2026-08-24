import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/AdminPrimitives";
import { notificationsApi } from "@/features/notifications/services/notificationsApi";
import { useToast } from "@/providers/ToastProvider";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["notifications", page], queryFn: () => notificationsApi.list(page) });
  const mark = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: () => toast("Could not update notification.", "error"),
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      toast("Notifications marked as read.", "success");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: () => toast("Could not mark notifications as read.", "error"),
  });
  const hrefFor = (type: string | null, id: string | null) => type === "event" && id ? `/events/${id}` : type === "announcement" && id ? `/announcements#feed-${id}` : null;
  const meta = query.data?.meta;
  const unreadCount = query.data?.data.filter((item) => item.status === "unread").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Registration updates, event reminders, and school announcements."
        actions={
          <Button variant="secondary" disabled={markAll.isPending || unreadCount === 0} onClick={() => markAll.mutate()}>
            <CheckCheck size={16} className="mr-2" />
            {markAll.isPending ? "Updating..." : "Mark all read"}
          </Button>
        }
      />

      <Card className="overflow-hidden border-slate-200 bg-white p-0 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-navy-800 dark:bg-navy-900">
          <p className="text-sm font-semibold text-[#102858] dark:text-white">{unreadCount} unread</p>
        </div>
        <div className="divide-y divide-slate-200">
          {(query.data?.data ?? []).map((item) => {
            const href = hrefFor(item.entity_type, item.entity_id);
            const card = (
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <span className={`rounded-lg p-2 ${item.status === "unread" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-navy-900 dark:text-navy-400"}`}>
                  <Bell size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold text-[#102858] dark:text-white">{item.title}</strong>
                    <StatusBadge tone={item.status === "unread" ? "info" : "neutral"}>{item.status}</StatusBadge>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-navy-300">{item.body}</span>
                  <span className="mt-2 block text-xs text-slate-400 dark:text-navy-500">{new Date(item.created_at).toLocaleString()}</span>
                </span>
                {href && <ExternalLink size={16} className="mt-1 shrink-0 text-slate-400" />}
              </div>
            );
            return (
              <div
                key={item.id}
                className={`p-5 transition hover:bg-slate-50 dark:hover:bg-navy-900 ${item.status === "unread" ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                onClick={() => item.status === "unread" && !mark.isPending && mark.mutate(item.id)}
              >
                {href ? <Link to={href}>{card}</Link> : card}
              </div>
            );
          })}
        </div>
        {query.isLoading && <div className="p-8 text-center text-sm text-slate-500">Loading notifications...</div>}
        {query.isError && <div className="p-8 text-center text-sm text-red-600">Could not load notifications. <button className="font-semibold underline" onClick={() => query.refetch()}>Try again</button></div>}
        {!query.isLoading && !query.isError && !query.data?.data.length && <EmptyState label="No notifications yet." />}
        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-600 dark:border-navy-800 dark:text-navy-300">
            <span>Page {meta.page} of {meta.total_pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
