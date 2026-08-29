/** Users feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface UserListItem {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
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

export type SystemRole = "admin" | "teacher" | "student_council" | "student";

export interface StudentCollegeProfile {
  student_number: string | null;
  department_id: string | null;
  course_id: string | null;
  section_id: string | null;
  year_level: number | null;
  profile_completed: boolean;
}
