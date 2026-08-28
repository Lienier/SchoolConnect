/** Create announcement page with new design system layout. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { apiErrorMessage } from "@/api/errors";
import { CreateAnnouncementForm } from "@/features/announcements/components/CreateAnnouncementForm";
import { useToast } from "@/providers/ToastProvider";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { useAuth } from "@/features/auth/context/AuthContext";
import { uploadsApi } from "@/features/uploads/services/uploadsApi";
import type { AnnouncementFormValues } from "@/features/announcements/validators";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";

export default function CreateAnnouncementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ values: AnnouncementFormValues; files: File[] } | null>(null);
  const isProfessor = Boolean(user?.roles?.includes("teacher"));
  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const { data: categories = [] } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: () => announcementsApi.listCategories(),
  });

  const shouldConfirmSubmit = (values: AnnouncementFormValues) => !isAdmin && (isProfessor || values.submit_for_approval);

  const createAnnouncement = async (values: AnnouncementFormValues, files: File[]) => {
    setSubmitting(true);
    try {
      const announcement = await announcementsApi.create({
        title: values.title,
        body: values.body,
        summary: values.summary || undefined,
        category_id: values.category_id || undefined,
        priority: values.priority as "normal" | "important" | "urgent",
        submit_for_approval: isAdmin ? false : isProfessor ? true : values.submit_for_approval,
      });
      if (files.length > 0) {
        const results = await Promise.allSettled(
          files.map((file) => uploadsApi.upload(file, { entity_type: "announcement", entity_id: announcement.id })),
        );
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed > 0) {
          toast(`Announcement created, but ${failed} attachment${failed === 1 ? "" : "s"} failed to upload.`, "warning");
        } else {
          toast(isProfessor ? "Announcement and attachments submitted for admin approval." : "Announcement and attachments created.", "success");
        }
      } else {
        toast(isProfessor ? "Announcement submitted for admin approval." : "Announcement created.", "success");
      }
      navigate("/announcements");
    } catch (error) {
      toast(apiErrorMessage(error, "Could not create announcement."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (values: AnnouncementFormValues, files: File[]) => {
    if (shouldConfirmSubmit(values)) {
      setPendingSubmit({ values, files });
      return;
    }
    await createAnnouncement(values, files);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isProfessor ? "New Professor Announcement" : "New Announcement"}
        subtitle={
          isAdmin
            ? "Create an official school bulletin directly."
            : isProfessor
              ? "Professor announcements are submitted to admin for approval before publishing."
              : "Draft a school bulletin and submit it for approval when ready."
        }
        actions={
          <Link to="/announcements">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Announcements
            </span>
          </Link>
        }
      />
      <CreateAnnouncementForm
        categories={categories}
        onSubmit={onSubmit}
        isSubmitting={submitting}
        showApprovalOption={!isAdmin}
        submitLabel={isProfessor ? "Submit Announcement" : "Create Announcement"}
      />
      <ConfirmActionModal
        open={!!pendingSubmit}
        title="Submit announcement"
        description="This will send the announcement to administrators for approval before it appears in the school feed."
        itemName={pendingSubmit?.values.title}
        confirmLabel="Submit Announcement"
        isLoading={submitting}
        onCancel={() => setPendingSubmit(null)}
        onConfirm={() => {
          if (!pendingSubmit) return;
          void createAnnouncement(pendingSubmit.values, pendingSubmit.files).finally(() => setPendingSubmit(null));
        }}
      />
    </div>
  );
}
