/** Zod schema for the event create form. */
import { z } from "zod";

function isBeforeToday(value: string) {
  if (!value) return false;
  const selected = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selected.setHours(0, 0, 0, 0);
  return selected < today;
}

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
  })
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time) > new Date(data.start_time),
    { message: "End time must be after start time.", path: ["end_time"] },
  )
  .refine((data) => !isBeforeToday(data.start_time), {
    message: "Start date cannot be in the past.",
    path: ["start_time"],
  })
  .refine((data) => !isBeforeToday(data.end_time), {
    message: "End date cannot be in the past.",
    path: ["end_time"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
