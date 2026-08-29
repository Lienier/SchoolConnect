/** Form to create and publish a new announcement. */
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Image as ImageIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { announcementSchema, type AnnouncementFormValues } from "@/features/announcements/validators";
import type { AnnouncementCategory } from "@/features/announcements/types";

interface Props {
  categories: AnnouncementCategory[];
  onSubmit: (values: AnnouncementFormValues, files: File[]) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function CreateAnnouncementForm({
  categories,
  onSubmit,
  isSubmitting,
  submitLabel = "Create Announcement",
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { priority: "normal" },
  });
  const accept = "image/png,image/jpeg,image/jpg,image/gif,application/pdf,.docx,.xlsx";
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
      <h2 className="mb-4 text-xl font-semibold text-navy-800">
        New Announcement
      </h2>
      <form onSubmit={handleSubmit((values) => onSubmit(values, files))} className="space-y-5" noValidate>
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
        <div>
          <Label htmlFor="attachments">Media and attachments</Label>
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <input
              id="attachments"
              type="file"
              multiple
              accept={accept}
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0d5ee8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-2 text-xs text-slate-500">
              Add images for post previews or attach PDF, DOCX, and XLSX files.
            </p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>{files.length} selected</span>
                <span>{formatSize(totalSize)}</span>
              </div>
              {files.map((file) => {
                const isImage = file.type.startsWith("image/");
                const Icon = isImage ? ImageIcon : FileText;
                return (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-blue-700" />
                    <span className="min-w-0 flex-1 truncate font-medium text-[#102858]">{file.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
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
