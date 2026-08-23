/** Announcements hub with a social-style bulletin feed. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, StatusBadge } from "@/components/ui/AdminPrimitives";
import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { CheckCircle2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { Announcement } from "@/features/announcements/types";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function AnnouncementsPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);
  const canManage = can("announcements.approve") || can("announcements.delete") || can("announcements.update");
  const isProfessor = Boolean(user?.roles?.includes("teacher"));

  const management = useQuery({
    queryKey: ["announcements-management"],
    queryFn: () => announcementsApi.list(),
    enabled: canManage,
  });

  const mutate = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
    onSuccess: () => {
      toast("Announcement updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["announcements-management"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: () => toast("Announcement action failed.", "error"),
  });

  const confirm = (title: string, message: string, action: () => Promise<void>) => setPendingAction({ title, message, action });
  const runAction = (announcement: Announcement, decision: "approved" | "rejected" | "returned") => {
    if (decision === "approved") return announcementsApi.approve(announcement.id, decision);
    return announcementsApi.approve(announcement.id, decision, decision === "returned" ? "Returned for revision." : "Rejected.");
  };
  const statusTone = (status: string) => status === "published" ? "success" : status === "pending_approval" ? "warning" : status === "archived" ? "neutral" : "info";
  const items = (management.data?.data ?? []).filter((item) => !isProfessor || item.author_id === user?.id);
  const lastReview = (announcement: Announcement) =>
    announcement.approvals?.filter((approval) => approval.decision !== "approved").at(-1);

  return (
    <div className="space-y-8">
      {canManage && (
        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#102858]">{isProfessor ? "My Professor Announcements" : "Announcement Management"}</h2>
              <p className="text-sm text-slate-500">{isProfessor ? "Track drafts, pending submissions, returned notes, and published posts." : "Review, publish, return, or remove announcements."}</p>
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
                      {lastReview(item)?.comment && <p className="mt-1 text-xs font-normal text-amber-700">{lastReview(item)?.comment}</p>}
                    </td>
                    <td>{item.author_name ?? "Unknown"}</td>
                    <td className="capitalize">{item.priority}</td>
                    <td><StatusBadge tone={statusTone(item.status)}>{item.status.replace("_", " ")}</StatusBadge></td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {!isProfessor && can("announcements.approve") && item.status === "pending_approval" && <Button size="sm" onClick={() => mutate.mutate(() => runAction(item, "approved"))}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Approve</Button>}
                        {!isProfessor && can("announcements.approve") && item.status === "pending_approval" && <Button size="sm" variant="secondary" onClick={() => confirm("Return announcement", "Return this announcement for revision?", () => runAction(item, "returned"))}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Return</Button>}
                        {!isProfessor && can("announcements.approve") && item.status === "pending_approval" && <Button size="sm" variant="danger" onClick={() => confirm("Reject announcement", "Reject this announcement?", () => runAction(item, "rejected"))}><X className="mr-1.5 h-3.5 w-3.5" />Reject</Button>}
                        {can("announcements.delete") && <Button size="sm" variant="danger" onClick={() => confirm("Delete announcement", "Delete this announcement?", () => announcementsApi.remove(item.id))}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
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
        description="Use the tabs to focus on school announcements, upcoming events, or pinned notices."
        defaultTab="all"
        showHeader={false}
      />
      <Modal
        open={!!pendingAction}
        title={pendingAction?.title ?? "Confirm action"}
        onClose={() => setPendingAction(null)}
        footer={<><Button variant="secondary" onClick={() => setPendingAction(null)}>Cancel</Button><Button variant="danger" isLoading={mutate.isPending} onClick={() => { if (pendingAction) mutate.mutate(pendingAction.action, { onSettled: () => setPendingAction(null) }); }}>Confirm</Button></>}
      >
        <p className="text-sm text-slate-600">{pendingAction?.message}</p>
      </Modal>
    </div>
  );
}
