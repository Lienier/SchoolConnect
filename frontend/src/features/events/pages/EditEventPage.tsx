import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CreateEventForm } from "@/features/events/components/CreateEventForm";
import { eventsApi } from "@/features/events/services/eventsApi";
import { uploadsApi } from "@/features/uploads/services/uploadsApi";
import { useToast } from "@/providers/ToastProvider";
import { apiErrorMessage } from "@/api/errors";
import { ForbiddenPage } from "@/components/ui/ErrorPages";
import type { EventFormValues } from "@/features/events/validators";

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function EditEventPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const eventQuery = useQuery({ queryKey: ["event", id], queryFn: () => eventsApi.get(id) });
  const categories = useQuery({ queryKey: ["event-categories"], queryFn: eventsApi.listCategories });
  const event = eventQuery.data;
  if (eventQuery.isError) return <p role="alert">Could not load the event. <button onClick={() => eventQuery.refetch()}>Retry</button></p>;
  if (!event) return <p>Loading event...</p>;
  if (!event.can_manage || event.status !== "approved") return <ForbiddenPage />;

  const save = async (values: EventFormValues, files: File[]) => {
    setSubmitting(true);
    try {
      await eventsApi.update(id, {
        title: values.title, description: values.description || "", category_id: values.category_id || "",
        start_time: new Date(values.start_time).toISOString(), end_time: new Date(values.end_time).toISOString(),
        location: values.location || "", capacity: values.capacity ? Number(values.capacity) : null,
        registration_deadline: values.registration_deadline === localInput(event.registration_deadline) ? undefined : values.registration_deadline ? new Date(values.registration_deadline).toISOString() : null,
        is_team_event: values.is_team_event, max_team_size: values.is_team_event ? Number(values.max_team_size) : null,
        approval_required: values.approval_required,
      });
      const uploads = await Promise.allSettled(files.map((file) => uploadsApi.upload(file, { entity_type: "event", entity_id: id })));
      toast(uploads.some((result) => result.status === "rejected") ? "Event saved; some photos could not be uploaded." : "Event saved.", uploads.some((result) => result.status === "rejected") ? "warning" : "success");
      await queryClient.invalidateQueries({ queryKey: ["event", id] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate(`/events/${id}`);
    } catch (error) { toast(apiErrorMessage(error, "Could not save event."), "error"); }
    finally { setSubmitting(false); }
  };
  return <div className="mx-auto max-w-2xl"><CreateEventForm key={event.id} categories={categories.data ?? []} initialValues={{
    title: event.title, description: event.description ?? "", category_id: event.category_id ?? "",
    start_time: localInput(event.start_time), end_time: localInput(event.end_time), location: event.location ?? "",
    capacity: event.capacity === null ? "" : String(event.capacity), registration_deadline: localInput(event.registration_deadline),
    is_team_event: event.is_team_event, max_team_size: event.max_team_size === null ? "" : String(event.max_team_size), approval_required: event.approval_required,
  }} onSubmit={save} isSubmitting={submitting} submitLabel="Save Event" /></div>;
}
