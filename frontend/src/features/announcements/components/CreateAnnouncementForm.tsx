/** Form to create a new announcement (draft or submit for approval). */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { announcementSchema, type AnnouncementFormValues } from "@/features/announcements/validators";
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Announcement title" {...register("title")} />
          {errors.title && (
            <p className="mt-1.5 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            rows={5}
            placeholder="Write the announcement..."
            {...register("body")}
          />
          {errors.body && (
            <p className="mt-1.5 text-sm text-red-600">{errors.body.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="summary">Summary (optional)</Label>
          <Input id="summary" placeholder="Short summary" {...register("summary")} />
          {errors.summary && (
            <p className="mt-1.5 text-sm text-red-600">{errors.summary.message}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select
              id="category_id"
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
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select {...register("priority")}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Checkbox {...register("submit_for_approval")} label="Submit for approval" />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create Announcement
        </Button>
      </form>
    </Card>
  );
}