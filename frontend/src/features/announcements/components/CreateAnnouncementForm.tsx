/** Form to create a new announcement (draft or submit for approval). */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  announcementSchema,
  type AnnouncementFormValues,
} from "@/features/announcements/validators";
import type { AnnouncementCategory } from "@/features/announcements/types";

interface Props {
  categories: AnnouncementCategory[];
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateAnnouncementForm({
  categories,
  onSubmit,
  isSubmitting,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { priority: "normal", submit_for_approval: false },
  });

  return (
    <Card className="w-full max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold text-navy-800">
        New Announcement
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Announcement title" {...register("title")} />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="body">Body</Label>
          <textarea
            id="body"
            rows={5}
            className="w-full rounded-xl border border-navy-200 bg-white p-4 text-sm text-navy-900 placeholder:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
            placeholder="Write the announcement…"
            {...register("body")}
          />
          {errors.body && (
            <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="summary">Summary (optional)</Label>
          <Input id="summary" placeholder="Short summary" {...register("summary")} />
          {errors.summary && (
            <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <select
              id="category_id"
              className="h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-sm text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
              {...register("category_id")}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className="h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-sm text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
              {...register("priority")}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" value="on" {...register("submit_for_approval")} />
          Submit for approval
        </label>
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create Announcement
        </Button>
      </form>
    </Card>
  );
}
