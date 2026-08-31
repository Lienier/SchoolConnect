/** College structure types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface Course {
  id: string;
  department_id: string;
  name: string;
  code: string;
  created_at: string;
}
export interface Section {
  id: string;
  course_id: string;
  semester_id: string;
  name: string;
  created_at: string;
}
export interface Organization {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  organization_type: "college_wide" | "student_council" | "department_organization";
  positions: string[];
  department_id: string | null;
  adviser_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface CouncilMember {
  user_id: string;
  full_name: string;
  email: string;
  username: string | null;
  position: string | null;
  student_number: string | null;
  department_id: string | null;
}
export interface CouncilCandidate {
  user_id: string;
  full_name: string;
  email: string;
  username: string | null;
  student_number: string | null;
  department_id: string | null;
}
export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}
export interface Semester {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface SchoolListResponse<T> extends ApiResponse<T[]> {
  meta?: PaginationMeta;
}

export type EntityKey =
  | "departments"
  | "courses"
  | "sections"
  | "organizations"
  | "academic_years"
  | "semesters";
