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
import { uploadsApi } from "@/features/uploads/services/uploadsApi";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["event-categories"],
    queryFn: () => eventsApi.listCategories(),
  });

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
      });
      if (files.length > 0) {
        const results = await Promise.allSettled(
          files.map((file) => uploadsApi.upload(file, { entity_type: "event", entity_id: event.id })),
        );
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed > 0) {
          toast(`Event created, but ${failed} photo${failed === 1 ? "" : "s"} failed to upload.`, "warning");
        } else {
          toast("Event and photos posted.", "success");
        }
      } else {
        toast("Event posted.", "success");
      }
      navigate("/events");
    } catch (error) {
      toast(apiErrorMessage(error, "Could not create event."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (values: EventFormValues, files: File[]) => {
    await createEvent(values, files);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Event"
        subtitle="Post a college event directly so students can see it."
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
        submitLabel="Post Event"
      />
    </div>
  );
}
