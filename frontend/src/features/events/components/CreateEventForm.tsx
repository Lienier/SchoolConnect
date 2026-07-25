/** Form to create a new event (draft or submit for approval). */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { eventSchema, type EventFormValues } from "@/features/events/validators";
import type { EventCategory } from "@/features/events/types";

interface Props {
  categories: EventCategory[];
  onSubmit: (values: EventFormValues) => Promise<void>;
  isSubmitting: boolean;
}

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Event title" {...register("title")} />
          {errors.title && (
            <p className="mt-1.5 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Describe the event..."
            {...register("description")}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_time">Start</Label>
            <Input
              id="start_time"
              type="datetime-local"
              {...register("start_time")}
            />
            {errors.start_time && (
              <p className="mt-1.5 text-sm text-red-600">
                {errors.start_time.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="end_time">End</Label>
            <Input
              id="end_time"
              type="datetime-local"
              {...register("end_time")}
            />
            {errors.end_time && (
              <p className="mt-1.5 text-sm text-red-600">
                {errors.end_time.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Venue" {...register("location")} />
          </div>
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select
              placeholder="Select category"
              {...register("category_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="mt-1.5 text-sm text-red-600">
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
        <div className="space-y-3">
          <Checkbox {...register("is_team_event")} label="This is a team event" />
          <Checkbox {...register("submit_for_approval")} label="Submit for approval" />
        </div>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create Event
        </Button>
      </form>
    </Card>
  );
}