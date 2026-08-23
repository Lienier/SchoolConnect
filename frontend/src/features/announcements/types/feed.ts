/** Shared bulletin feed item used by the social-style announcement stream. */
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { AnnouncementAttachment } from "@/features/announcements/types";

export type FeedItemType = "announcement" | "event";
export type FeedAuthorRole = "admin" | "teacher" | "student_council" | "student" | string;

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  body: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_role: FeedAuthorRole | null;
  category?: string | null;
  status?: string | null;
  priority?: "normal" | "important" | "urgent" | null;
  is_pinned?: boolean;
  is_emergency?: boolean;
  created_at: string;
  updated_at?: string | null;
  tags?: string[];

  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  capacity?: number | null;
  registered_count?: number | null;
  registration_deadline?: string | null;
  is_team_event?: boolean;
  max_team_size?: number | null;
  approval_required?: boolean;
  target_audience?: string[] | null;
  banner_url?: string | null;
  attachments?: AnnouncementAttachment[];
}

export interface FeedListResponse extends ApiResponse<FeedItem[]> {
  meta?: PaginationMeta;
}
