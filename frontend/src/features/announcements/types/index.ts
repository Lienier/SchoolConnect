/** Announcements feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface AnnouncementCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface AnnouncementAttachment {
  id: string;
  file_id: string;
  filename: string | null;
  original_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  url: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  summary: string | null;
  category_id: string | null;
  category: string | null;
  author_id: string;
  priority: "normal" | "important" | "urgent";
  status: "published" | "archived";
  published_at: string | null;
  expires_at: string | null;
  target_audience: string[] | null;
  is_pinned: boolean;
  is_emergency: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  author_role?: string | null;
  attachments?: AnnouncementAttachment[];
  banner_url?: string | null;
}

export interface AnnouncementListResponse
  extends ApiResponse<Announcement[]> {
  meta?: PaginationMeta;
}

export type CategoryListResponse = ApiResponse<AnnouncementCategory[]>;
