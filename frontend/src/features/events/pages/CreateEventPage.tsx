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
import { Navbar } from "@/components/ui/Navbar";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

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
        submit_for_approval: values.submit_for_approval,
      });
      toast("Event created.", "success");
      navigate("/events");
    } catch {
      toast("Could not create event.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title="Create Event"
        breadcrumbs={[
          { label: "Events", href: "/events" },
          { label: "New Event" },
        ]}
        actions={
          <Link to="/events">
            <span className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </span>
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <CreateEventForm
          categories={categories}
          onSubmit={onSubmit}
          isSubmitting={submitting}
        />
      </main>
    </div>
  );
}