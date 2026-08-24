/** Events feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { AnnouncementAttachment } from "@/features/announcements/types";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "archived"
  | "returned";

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface EventApproval {
  id: string;
  reviewer_id: string;
  reviewer_name: string | null;
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
  organizer_name?: string | null;
  organizer_avatar?: string | null;
  organizer_role?: string | null;
  attachments?: AnnouncementAttachment[];
  banner_url?: string | null;
  approvals?: EventApproval[];
}

export interface EventResult {
  id: string;
  event_id: string;
  placement: number | null;
  title: string;
  winner_user_id: string | null;
  team_id: string | null;
  remarks: string | null;
  attachment_file_id: string | null;
  created_by: string;
  created_at: string;
  event_title?: string | null;
  participant_name?: string | null;
  participant_email?: string | null;
  reviewer_name?: string | null;
  team_name?: string | null;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: "leader" | "member" | string;
  joined_at: string | null;
}

export interface TeamRegistration {
  id: string;
  event_id: string;
  name: string;
  team_code: string;
  leader_id: string;
  members: TeamMember[];
}

export interface EventListResponse extends ApiResponse<SchoolEvent[]> {
  meta?: PaginationMeta;
}

export type EventCategoryListResponse = ApiResponse<EventCategory[]>;

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  event_title?: string | null;
  participant_name?: string | null;
  participant_email?: string | null;
  reviewer_name?: string | null;
  team_name?: string | null;
  team_id: string | null;
  team_code?: string | null;
  team_role?: "leader" | "member" | string | null;
  team_leader_id?: string | null;
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
