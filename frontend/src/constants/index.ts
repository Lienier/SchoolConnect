/** Application-wide constants. Values that vary by environment come from Vite env vars. */

export const APP_NAME = "SchoolConnect";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const TOKEN_STORAGE_KEY = "sc_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "sc_refresh_token";

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT_COUNCIL: "student_council",
  DEPARTMENT_STUDENT_LEADER: "department_student_leader",
  STUDENT: "student",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
