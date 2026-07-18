/** Events feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "archived";

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface EventApproval {
  id: string;
  reviewer_id: string;
  decision: string;
  comment: string | null;
  decided_at: string | null;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category: string | null;
  organizer_id: string;
  organization_id: string | null;
  status: EventStatus;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  capacity: number | null;
  registration_deadline: string | null;
  is_team_event: boolean;
  max_team_size: number | null;
  approval_required: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  approvals?: EventApproval[];
}

export interface EventListResponse extends ApiResponse<SchoolEvent[]> {
  meta?: PaginationMeta;
}

export interface EventCategoryListResponse
  extends ApiResponse<EventCategory[]> {}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  team_id: string | null;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "waitlisted"
    | "cancelled"
    | "attended"
    | "absent";
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface RegistrationListResponse
  extends ApiResponse<Registration[]> {
  meta?: PaginationMeta;
}
