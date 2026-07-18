/** Zod schema for the event create form. */
import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required.").max(200, "Title is too long."),
    description: z.string().optional().or(z.literal("")),
    category_id: z.string().optional().or(z.literal("")),
    start_time: z.string().min(1, "Start time is required."),
    end_time: z.string().min(1, "End time is required."),
    location: z.string().max(200).optional().or(z.literal("")),
    capacity: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || (Number(v) >= 0 && Number.isInteger(Number(v))),
        "Capacity must be a non-negative whole number.",
      ),
    is_team_event: z.boolean().default(false),
    max_team_size: z.string().optional().or(z.literal("")),
    submit_for_approval: z.boolean().default(false),
  })
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time) > new Date(data.start_time),
    { message: "End time must be after start time.", path: ["end_time"] },
  );

export type EventFormValues = z.infer<typeof eventSchema>;
