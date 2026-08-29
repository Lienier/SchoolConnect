import { Component, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { CalendarDays } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { eventsApi } from "@/features/events/services/eventsApi";

const statusColors: Record<string, string> = {
  approved: "#2563eb",
  ongoing: "#16a34a",
  completed: "#64748b",
  cancelled: "#dc2626",
};

class CalendarErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Calendar failed to render", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          The interactive calendar could not be rendered. Use the events list to continue.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CalendarPage() {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [availability, setAvailability] = useState("");
  const navigate = useNavigate();
  const events = useQuery({
    queryKey: ["calendar-events", status, categoryId],
    queryFn: () => eventsApi.list({ status: status || undefined, category_id: categoryId || undefined }),
  });
  const categories = useQuery({ queryKey: ["event-categories"], queryFn: eventsApi.listCategories });

  const filteredEvents = useMemo(() => {
    return (events.data?.data ?? []).filter((event) => {
      if (organizer && !(event.organizer_name ?? "").toLowerCase().includes(organizer.toLowerCase())) return false;
      if (availability === "open" && event.registration_deadline && new Date(event.registration_deadline) < new Date()) return false;
      if (availability === "closed" && (!event.registration_deadline || new Date(event.registration_deadline) >= new Date())) return false;
      return true;
    });
  }, [availability, events.data?.data, organizer]);

  const calendarEvents = useMemo<EventInput[]>(() => {
    const items: EventInput[] = [];
    for (const event of filteredEvents) {
      if (!event.start_time) continue;
      const color = statusColors[event.status] ?? "#2563eb";
      items.push({
        id: event.id,
        title: event.title,
        start: event.start_time,
        end: event.end_time ?? undefined,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { eventId: event.id, kind: "event" },
      });
      if (event.registration_deadline) {
        items.push({
          id: `${event.id}-deadline`,
          title: `Registration deadline: ${event.title}`,
          start: event.registration_deadline,
          allDay: false,
          backgroundColor: "#f59e0b",
          borderColor: "#f59e0b",
          extendedProps: { eventId: event.id, kind: "deadline" },
        });
      }
    }
    return items;
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Calendar"
        subtitle="Browse events, schedules, and registration deadlines."
        actions={null}
      />

      <Card className="border-slate-200 p-4 shadow-sm">
        <div className="mb-5 grid gap-3 lg:grid-cols-4">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All event statuses</option>
            <option value="approved">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All categories</option>
            {(categories.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input value={organizer} onChange={(event) => setOrganizer(event.target.value)} placeholder="Organizer name..." className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Any registration availability</option>
            <option value="open">Registration open</option>
            <option value="closed">Registration closed</option>
          </select>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-600" />
            {filteredEvents.length} scheduled event{filteredEvents.length === 1 ? "" : "s"}
          </span>
          <Link to="/events" className="font-bold text-blue-700 hover:underline">Browse all events</Link>
        </div>

        {events.isError && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load the calendar right now. <button className="font-semibold underline" onClick={() => events.refetch()}>Try again</button></p>}
        <CalendarErrorBoundary>
          <div className="school-calendar relative overflow-x-auto">
            {events.isLoading && <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/70 pt-20 text-sm text-slate-500">Loading calendar...</div>}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
              buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
              events={calendarEvents}
              eventDisplay="block"
              dayMaxEvents={3}
              height="auto"
              contentHeight="auto"
              nowIndicator
              navLinks
              eventClick={(info) => {
                info.jsEvent.preventDefault();
                const eventId = info.event.extendedProps.eventId as string | undefined;
                if (eventId) navigate(`/events/${eventId}`);
              }}
            />
          </div>
        </CalendarErrorBoundary>
      </Card>
    </div>
  );
}
