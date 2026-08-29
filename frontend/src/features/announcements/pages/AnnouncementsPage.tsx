/** Announcements hub with a social-style bulletin feed. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { apiErrorMessage } from "@/api/errors";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { EmptyState, StatusBadge } from "@/components/ui/AdminPrimitives";
import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { Archive, Plus, Trash2 } from "lucide-react";
import type { Announcement } from "@/features/announcements/types";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function AnnouncementsPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    message: string;
    itemName: string;
    confirmLabel: string;
    variant?: "primary" | "danger" | "secondary";
    successMessage: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const canManage = can("announcements.delete") || can("announcements.update");
  const isProfessor = Boolean(user?.roles?.includes("teacher"));

  const management = useQuery({
    queryKey: ["announcements-management"],
    queryFn: () => announcementsApi.list(),
    enabled: canManage,
  });

  const mutate = useMutation({
    mutationFn: (pending: NonNullable<typeof pendingAction>) => pending.action(),
    onSuccess: (_data, pending) => {
      toast(pending.successMessage, "success");
      queryClient.invalidateQueries({ queryKey: ["announcements-management"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error) => toast(apiErrorMessage(error, "Announcement action failed."), "error"),
  });

  const confirm = (
    announcement: Announcement,
    title: string,
    message: string,
    confirmLabel: string,
    successMessage: string,
    action: () => Promise<unknown>,
    variant: "primary" | "danger" | "secondary" = "primary",
  ) => setPendingAction({ title, message, itemName: announcement.title, confirmLabel, successMessage, action, variant });
  const statusTone = (status: string) => status === "published" ? "success" : "neutral";
  const items = (management.data?.data ?? []).filter((item) => !isProfessor || item.author_id === user?.id);

  return (
    <div className="space-y-8">
      {canManage && (
        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#102858]">{isProfessor ? "My Professor Announcements" : "Announcement Management"}</h2>
              <p className="text-sm text-slate-500">{isProfessor ? "Track your posted announcements." : "Hide, archive, or remove announcements."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/announcements/new">
                <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />New Announcement</Button>
              </Link>
              {management.isError && <Button variant="secondary" onClick={() => management.refetch()}>Retry</Button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Author</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold text-[#102858]">
                      {item.title}
                    </td>
                    <td>{item.author_name ?? "Unknown"}</td>
                    <td className="capitalize">{item.priority}</td>
                    <td><StatusBadge tone={statusTone(item.status)}>{item.status.replace("_", " ")}</StatusBadge></td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {can("announcements.update") && item.status !== "archived" && <Button size="sm" variant="secondary" onClick={() => confirm(item, "Archive announcement", "This will hide the announcement from the college feed without deleting its record.", "Archive", "Announcement archived.", () => announcementsApi.archive(item.id), "secondary")}><Archive className="mr-1.5 h-3.5 w-3.5" />Archive</Button>}
                        {can("announcements.delete") && <Button size="sm" variant="danger" onClick={() => confirm(item, "Delete announcement", "This will remove the announcement from management views and the feed.", "Delete", "Announcement deleted.", () => announcementsApi.remove(item.id), "danger")}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {management.isLoading && <div className="p-8 text-center text-sm text-slate-500">Loading announcements...</div>}
          {!management.isLoading && !management.isError && !items.length && <EmptyState label="No announcements found." />}
        </Card>
      )}

      <BulletinFeed
        title="Announcements"
        description="Use the tabs to focus on college announcements, upcoming events, or pinned notices."
        defaultTab="all"
        showHeader={false}
      />
      <ConfirmActionModal
        open={!!pendingAction}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.message ?? ""}
        itemName={pendingAction?.itemName}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        confirmVariant={pendingAction?.variant}
        isLoading={mutate.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) mutate.mutate(pendingAction, { onSettled: () => setPendingAction(null) });
        }}
      />
    </div>
  );
}
