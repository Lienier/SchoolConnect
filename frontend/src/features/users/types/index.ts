/** Users feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface UserListItem {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  status: string;
  avatar_url: string | null;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
}

export interface UserListResponse extends ApiResponse<UserListItem[]> {
  meta?: PaginationMeta;
}

export type UserStatus = "active" | "inactive" | "suspended" | "invited";
