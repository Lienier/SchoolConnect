/** Create announcement page. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import {
  announcementSchema,
  type AnnouncementFormValues,
} from "@/features/announcements/validators";
import { CreateAnnouncementForm } from "@/features/announcements/components/CreateAnnouncementForm";
import { useToast } from "@/providers/ToastProvider";

export default function CreateAnnouncementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: () => announcementsApi.listCategories(),
  });

  const onSubmit = async (values: AnnouncementFormValues) => {
    try {
      await announcementsApi.create({
        title: values.title,
        body: values.body,
        summary: values.summary || undefined,
        category_id: values.category_id || undefined,
        priority: values.priority,
        submit_for_approval: values.submit_for_approval,
      });
      toast("Announcement created.", "success");
      navigate("/announcements");
    } catch {
      toast("Could not create announcement.", "error");
    }
  };

  return (
    <main className="flex min-h-screen items-start justify-center bg-navy-50 px-4 py-10">
      <CreateAnnouncementForm
        categories={categories}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    </main>
  );
}
