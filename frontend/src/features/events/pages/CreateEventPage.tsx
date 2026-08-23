/** Create event page with new design system layout. */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { eventsApi } from "@/features/events/services/eventsApi";
import { CreateEventForm } from "@/features/events/components/CreateEventForm";
import type { EventFormValues } from "@/features/events/validators";
import { useToast } from "@/providers/ToastProvider";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isProfessor = Boolean(user?.roles?.includes("teacher"));

  const { data: categories = [] } = useQuery({
    queryKey: ["event-categories"],
    queryFn: () => eventsApi.listCategories(),
  });

  const onSubmit = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      await eventsApi.create({
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
        submit_for_approval: isProfessor ? true : values.submit_for_approval,
      });
      toast(isProfessor ? "Event submitted for admin approval." : "Event created.", "success");
      navigate("/events");
    } catch {
      toast("Could not create event.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isProfessor ? "New Professor Event" : "New Event"}
        subtitle={isProfessor ? "Professor events are submitted to admin for approval before students can register." : "Create a draft event or submit it for approval."}
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
      />
    </div>
  );
}
