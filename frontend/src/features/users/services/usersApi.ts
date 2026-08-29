/** Users API calls (admin management surface). */
import { apiClient } from "@/api/client";
import type { ApiResponse } from "@/types/api";
import type { AuthUser } from "@/features/auth/types";
import type { StudentCollegeProfile, SystemRole, UserListItem, UserListResponse, UserStatus } from "@/features/users/types";

export const usersApi = {
  async list(
    params: {
      page?: number;
      search?: string;
      status?: UserStatus | "";
      role?: string;
      sort?: string;
    } = {},
  ): Promise<{ data: UserListResponse["data"]; meta?: UserListResponse["meta"] }> {
    const { data } = await apiClient.get<UserListResponse>("/users", { params });
    return { data: data.data, meta: data.meta };
  },

  async disable(id: string): Promise<void> {
    await apiClient.post(`/users/${id}/disable`);
  },
  async suspend(id: string): Promise<void> {
    await apiClient.post(`/users/${id}/suspend`);
  },
  async reactivate(id: string): Promise<void> {
    await apiClient.post(`/users/${id}/reactivate`);
  },
  async resetPassword(id: string, new_password: string): Promise<void> {
    await apiClient.post(`/users/${id}/reset-password`, { new_password });
  },
  async create(payload: {
    email: string;
    full_name: string;
    password: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    username?: string;
    role?: SystemRole;
    roles?: string[];
    status?: UserStatus;
    student_number?: string;
    department_id?: string;
    course_id?: string;
    section_id?: string;
    officer_position?: string;
  }): Promise<UserListItem> {
    const { data } = await apiClient.post<ApiResponse<UserListItem>>("/users", payload);
    return data.data;
  },
  async update(id: string, payload: { full_name?: string; username?: string | null; status?: UserStatus }): Promise<UserListItem> {
    const { data } = await apiClient.patch<ApiResponse<UserListItem>>(`/users/${id}`, payload);
    return data.data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
  async assignRoles(id: string, roles: string[]): Promise<UserListItem> {
    const { data } = await apiClient.put<ApiResponse<UserListItem>>(`/users/${id}/roles`, { roles });
    return data.data;
  },
  async roles(): Promise<{ name: string; display_name: string; is_system: boolean }[]> {
    const { data } = await apiClient.get<ApiResponse<{ name: string; display_name: string; is_system: boolean }[]>>("/users/roles/all");
    return data.data;
  },
  async getMyProfile(): Promise<AuthUser> {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>("/users/me/profile");
    return data.data;
  },
  async updateMyProfile(payload: { first_name?: string | null; last_name?: string | null; phone?: string | null }): Promise<AuthUser> {
    const { data } = await apiClient.patch<ApiResponse<AuthUser>>("/users/me/profile", payload);
    return data.data;
  },
  async getMyStudentProfile(): Promise<StudentCollegeProfile> {
    const { data } = await apiClient.get<ApiResponse<StudentCollegeProfile>>("/users/me/student-profile");
    return data.data;
  },
  async updateMyStudentProfile(payload: { department_id: string; course_id: string; section_id: string }): Promise<StudentCollegeProfile> {
    const { data } = await apiClient.patch<ApiResponse<StudentCollegeProfile>>("/users/me/student-profile", payload);
    return data.data;
  },
};
