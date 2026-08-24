/** Form to create a new event (draft or submit for approval). */
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ImageIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

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
  onSubmit: (values: EventFormValues, files: File[]) => Promise<void>;
  isSubmitting: boolean;
  showApprovalOption?: boolean;
  submitLabel?: string;
}

export function CreateEventForm({
  categories,
  onSubmit,
  isSubmitting,
  showApprovalOption = true,
  submitLabel = "Create Event",
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { is_team_event: false, submit_for_approval: false },
  });

  const isTeamEvent = useWatch({ control, name: "is_team_event" });
  const accept = "image/png,image/jpeg,image/jpg,image/gif";
  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold text-navy-800">New Event</h2>
      <form onSubmit={handleSubmit((values) => onSubmit(values, files))} className="space-y-5" noValidate>
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
          {showApprovalOption && <Checkbox {...register("submit_for_approval")} label="Submit for approval" />}
        </div>
        <div>
          <Label htmlFor="event_photos">Event photo</Label>
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-navy-800 dark:bg-navy-900">
            <input
              id="event_photos"
              type="file"
              multiple
              accept={accept}
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0d5ee8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 dark:text-navy-300"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-navy-400">
              Add PNG, JPG, JPEG, or GIF images. The first image becomes the event preview photo.
            </p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-navy-400">
                <span>{files.length} selected</span>
                <span>{formatSize(totalSize)}</span>
              </div>
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-800 dark:bg-navy-950">
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
                  <span className="min-w-0 flex-1 truncate font-medium text-[#102858] dark:text-white">{file.name}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-navy-400">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-navy-900 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
