/** Form to create a new event (draft or submit for approval). */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { eventSchema, type EventFormValues } from "@/features/events/validators";
import type { EventCategory } from "@/features/events/types";

interface Props {
  categories: EventCategory[];
  onSubmit: (values: EventFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const inputClass =
  "h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-sm text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400";

export function CreateEventForm({ categories, onSubmit, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { is_team_event: false, submit_for_approval: false },
  });

  const isTeamEvent = watch("is_team_event");

  return (
    <Card className="w-full max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold text-navy-800">New Event</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Event title" {...register("title")} />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-xl border border-navy-200 bg-white p-4 text-sm text-navy-900 placeholder:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
            placeholder="Describe the event…"
            {...register("description")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time">Start</Label>
            <input
              id="start_time"
              type="datetime-local"
              className={inputClass}
              {...register("start_time")}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-red-600">
                {errors.start_time.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="end_time">End</Label>
            <input
              id="end_time"
              type="datetime-local"
              className={inputClass}
              {...register("end_time")}
            />
            {errors.end_time && (
              <p className="mt-1 text-sm text-red-600">
                {errors.end_time.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Venue" {...register("location")} />
          </div>
          <div>
            <Label htmlFor="category_id">Category</Label>
            <select id="category_id" className={inputClass} {...register("category_id")}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="capacity">Capacity (optional)</Label>
            <Input
              id="capacity"
              type="number"
              min={0}
              placeholder="Unlimited"
              {...register("capacity")}
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600">
                {errors.capacity.message}
              </p>
            )}
          </div>
          {isTeamEvent && (
            <div>
              <Label htmlFor="max_team_size">Max team size</Label>
              <Input
                id="max_team_size"
                type="number"
                min={2}
                placeholder="e.g. 4"
                {...register("max_team_size")}
              />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" {...register("is_team_event")} />
          This is a team event
        </label>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" {...register("submit_for_approval")} />
          Submit for approval
        </label>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create Event
        </Button>
      </form>
    </Card>
  );
}
