/** Create announcement page with new design system layout. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { announcementsApi } from "@/features/announcements/services/announcementsApi";
import { CreateAnnouncementForm } from "@/features/announcements/components/CreateAnnouncementForm";
import { useToast } from "@/providers/ToastProvider";
import { Navbar } from "@/components/ui/Navbar";

export default function CreateAnnouncementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: () => announcementsApi.listCategories(),
  });

  const onSubmit = async (values: { title: string; body: string; summary?: string; category_id?: string; priority: string; submit_for_approval: boolean }) => {
    try {
      await announcementsApi.create({
        title: values.title,
        body: values.body,
        summary: values.summary || undefined,
        category_id: values.category_id || undefined,
        priority: values.priority as "normal" | "important" | "urgent",
        submit_for_approval: values.submit_for_approval,
      });
      toast("Announcement created.", "success");
      navigate("/announcements");
    } catch {
      toast("Could not create announcement.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title="Create Announcement"
        breadcrumbs={[
          { label: "Announcements", href: "/announcements" },
          { label: "New Announcement" },
        ]}
        actions={
          <Link to="/announcements">
            <span className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Announcements
            </span>
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <CreateAnnouncementForm
          categories={categories}
          onSubmit={onSubmit}
          isSubmitting={false}
        />
      </main>
    </div>
  );
}