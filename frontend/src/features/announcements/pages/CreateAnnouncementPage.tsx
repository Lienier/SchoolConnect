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
import { uploadsApi } from "@/features/uploads/services/uploadsApi";
import type { AnnouncementFormValues } from "@/features/announcements/validators";

export default function CreateAnnouncementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: () => announcementsApi.listCategories(),
  });

  const createAnnouncement = async (values: AnnouncementFormValues, files: File[]) => {
    setSubmitting(true);
    try {
      const announcement = await announcementsApi.create({
        title: values.title,
        body: values.body,
        summary: values.summary || undefined,
        category_id: values.category_id || undefined,
        priority: values.priority as "normal" | "important" | "urgent",
      });
      if (files.length > 0) {
        const results = await Promise.allSettled(
          files.map((file) => uploadsApi.upload(file, { entity_type: "announcement", entity_id: announcement.id })),
        );
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed > 0) {
          toast(`Announcement created, but ${failed} attachment${failed === 1 ? "" : "s"} failed to upload.`, "warning");
        } else {
          toast("Announcement and attachments posted.", "success");
        }
      } else {
        toast("Announcement posted.", "success");
      }
      navigate("/announcements");
    } catch (error) {
      toast(apiErrorMessage(error, "Could not create announcement."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (values: AnnouncementFormValues, files: File[]) => {
    await createAnnouncement(values, files);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Announcement"
        subtitle="Post a college bulletin directly to the feed."
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
        submitLabel="Post Announcement"
      />
    </div>
  );
}
