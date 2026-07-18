/** Announcements feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface AnnouncementCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
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
  status: "draft" | "pending_approval" | "published" | "archived";
  published_at: string | null;
  expires_at: string | null;
  target_audience: string[] | null;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementListResponse
  extends ApiResponse<Announcement[]> {
  meta?: PaginationMeta;
}

export interface CategoryListResponse extends ApiResponse<AnnouncementCategory[]> {}
