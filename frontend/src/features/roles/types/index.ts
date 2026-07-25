/** Roles feature types matching the backend API. */
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  priority: number | null;
  created_at: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string | null;
  action: string | null;
  description: string | null;
}

export interface RoleListResponse extends ApiResponse<Role[]> {
  meta?: PaginationMeta;
}

export interface PermissionListResponse extends ApiResponse<Permission[]> {}
