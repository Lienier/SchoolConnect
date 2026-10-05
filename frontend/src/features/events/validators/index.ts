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

export function eventSchemaFor(existingDeadline?: string) {
  return z
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
    registration_deadline: z.string().optional().or(z.literal("")),
    approval_required: z.boolean().default(true),
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
  })
  .refine((data) => !data.is_team_event || (!!data.max_team_size && Number.isInteger(Number(data.max_team_size)) && Number(data.max_team_size) >= 2), { message: "Team size must be a whole number of at least 2.", path: ["max_team_size"] })
  .refine((data) => data.registration_deadline === existingDeadline || !data.registration_deadline || !isBeforeToday(data.registration_deadline), { message: "Registration deadline cannot be in the past.", path: ["registration_deadline"] })
  .refine((data) => !data.registration_deadline || new Date(data.registration_deadline) <= new Date(data.start_time), { message: "Registration deadline must be on or before the start time.", path: ["registration_deadline"] });

}

export const eventSchema = eventSchemaFor();

export type EventFormValues = z.infer<typeof eventSchema>;
