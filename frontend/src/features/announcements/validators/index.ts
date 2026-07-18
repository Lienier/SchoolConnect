/** Zod schemas for the announcement create form. */
import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200, "Title is too long."),
  body: z.string().min(1, "Body is required."),
  summary: z.string().max(300, "Summary is too long.").optional().or(z.literal("")),
  category_id: z.string().optional().or(z.literal("")),
  priority: z.enum(["normal", "important", "urgent"]),
  submit_for_approval: z.boolean().default(false),
});

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
