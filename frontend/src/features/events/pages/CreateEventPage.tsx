/** Create event page with new design system layout. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { eventsApi } from "@/features/events/services/eventsApi";
import { apiErrorMessage } from "@/api/errors";
import { CreateEventForm } from "@/features/events/components/CreateEventForm";
import type { EventFormValues } from "@/features/events/validators";
import { useToast } from "@/providers/ToastProvider";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { useAuth } from "@/features/auth/context/AuthContext";
import { uploadsApi } from "@/features/uploads/services/uploadsApi";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ values: EventFormValues; files: File[] } | null>(null);
  const isProfessor = Boolean(user?.roles?.includes("teacher"));
  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const { data: categories = [] } = useQuery({
    queryKey: ["event-categories"],
    queryFn: () => eventsApi.listCategories(),
  });

  const shouldConfirmSubmit = (values: EventFormValues) => !isAdmin && (isProfessor || values.submit_for_approval);

  const createEvent = async (values: EventFormValues, files: File[]) => {
    setSubmitting(true);
    try {
      const event = await eventsApi.create({
        title: values.title,
        description: values.description || undefined,
        category_id: values.category_id || undefined,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        location: values.location || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        is_team_event: values.is_team_event,
        max_team_size: values.max_team_size
          ? Number(values.max_team_size)
          : undefined,
        submit_for_approval: isAdmin ? false : isProfessor ? true : values.submit_for_approval,
      });
      if (files.length > 0) {
        const results = await Promise.allSettled(
          files.map((file) => uploadsApi.upload(file, { entity_type: "event", entity_id: event.id })),
        );
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed > 0) {
          toast(`Event created, but ${failed} photo${failed === 1 ? "" : "s"} failed to upload.`, "warning");
        } else {
          toast(isProfessor ? "Event and photos submitted for admin approval." : "Event and photos created.", "success");
        }
      } else {
        toast(isProfessor ? "Event submitted for admin approval." : "Event created.", "success");
      }
      navigate("/events");
    } catch (error) {
      toast(apiErrorMessage(error, "Could not create event."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (values: EventFormValues, files: File[]) => {
    if (shouldConfirmSubmit(values)) {
      setPendingSubmit({ values, files });
      return;
    }
    await createEvent(values, files);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isProfessor ? "New Professor Event" : "New Event"}
        subtitle={
          isAdmin
            ? "Create an official school event directly."
            : isProfessor
              ? "Professor events are submitted to admin for approval before students can register."
              : "Create a draft event or submit it for approval."
        }
        actions={
          <Link to="/events">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </span>
          </Link>
        }
      />
      <CreateEventForm
        categories={categories}
        onSubmit={onSubmit}
        isSubmitting={submitting}
        showApprovalOption={!isAdmin}
        submitLabel={isAdmin ? "Create Event" : isProfessor ? "Submit Event" : "Create Event"}
      />
      <ConfirmActionModal
        open={!!pendingSubmit}
        title="Submit event"
        description="This will send the event to administrators for approval before students can register."
        itemName={pendingSubmit?.values.title}
        confirmLabel="Submit Event"
        isLoading={submitting}
        onCancel={() => setPendingSubmit(null)}
        onConfirm={() => {
          if (!pendingSubmit) return;
          void createEvent(pendingSubmit.values, pendingSubmit.files).finally(() => setPendingSubmit(null));
        }}
      />
    </div>
  );
}
