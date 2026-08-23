import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileCheck2, Megaphone, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { eventsApi } from "@/features/events/services/eventsApi";
import { useToast } from "@/providers/ToastProvider";

type ApprovalType = "announcement" | "event";
type ApprovalDecision = "approved" | "rejected" | "returned";

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  submittedBy: string | null;
  submittedAt: string;
  status: string;
}

export function ApprovalInboxPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{
    item: ApprovalItem;
    decision: ApprovalDecision;
  } | null>(null);
  const [comment, setComment] = useState("");

  const announcements = useQuery({
    queryKey: ["approvals", "announcements", "pending"],
    queryFn: () => announcementsApi.list({ status: "pending_approval" }),
  });
  const events = useQuery({
    queryKey: ["approvals", "events", "pending"],
    queryFn: () => eventsApi.list({ status: "pending_approval" }),
  });

  const items = useMemo<ApprovalItem[]>(() => {
    const announcementItems = (announcements.data?.data ?? []).map((item) => ({
      id: item.id,
      type: "announcement" as const,
      title: item.title,
      description: item.summary ?? item.body,
      submittedBy: item.author_name ?? null,
      submittedAt: item.created_at,
      status: item.status,
    }));
    const eventItems = (events.data?.data ?? []).map((item) => ({
      id: item.id,
      type: "event" as const,
      title: item.title,
      description: item.description,
      submittedBy: item.organizer_name ?? null,
      submittedAt: item.created_at,
      status: item.status,
    }));
    return [...announcementItems, ...eventItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [announcements.data?.data, events.data?.data]);

  const action = useMutation({
    mutationFn: async ({
      item,
      decision,
      comment,
    }: {
      item: ApprovalItem;
      decision: ApprovalDecision;
      comment?: string;
    }) =>
      item.type === "announcement"
        ? announcementsApi.approve(item.id, decision, comment)
        : eventsApi.approve(item.id, decision, comment),
    onSuccess: () => {
      toast("Approval updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast("Approval action failed.", "error"),
    onSettled: () => {
      setConfirm(null);
      setComment("");
    },
  });

  const isLoading = announcements.isLoading || events.isLoading;
  const isError = announcements.isError || events.isError;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          Workflow
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102858]">
          Approval Inbox
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Review pending announcements and event proposals from one queue.
        </p>
      </div>

      <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
        {isLoading && <div className="p-8 text-center text-sm text-slate-500">Loading approvals...</div>}
        {isError && (
          <div className="p-8 text-center text-sm text-red-600">
            Could not load approvals.
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-500">
            <FileCheck2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            All caught up. There are no pending submissions.
          </div>
        )}
        {items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone="warning">{item.status.replaceAll("_", " ")}</Badge>
                    <Badge tone="info">{item.type}</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-[#102858]">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {item.description ?? "No description provided."}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Submitted by {item.submittedBy ?? "Unknown"} on{" "}
                    {new Date(item.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={action.isPending} onClick={() => setConfirm({ item, decision: "approved" })}>
                    <Check size={14} className="mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" disabled={action.isPending} onClick={() => setConfirm({ item, decision: "returned" })}>
                    <Megaphone size={14} className="mr-1" />
                    Return
                  </Button>
                  <Button size="sm" variant="danger" disabled={action.isPending} onClick={() => setConfirm({ item, decision: "rejected" })}>
                    <X size={14} className="mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(confirm)}
        title="Confirm approval action"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.decision === "rejected" ? "danger" : "primary"}
              disabled={action.isPending}
              onClick={() =>
                confirm &&
                action.mutate({
                  item: confirm.item,
                  decision: confirm.decision,
                  comment: comment.trim() || undefined,
                })
              }
            >
              {action.isPending ? "Saving..." : "Confirm"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            This will mark "{confirm?.item.title}" as {confirm?.decision}.
          </p>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional review comment"
            className="h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </Modal>
    </div>
  );
}

export default ApprovalInboxPage;
