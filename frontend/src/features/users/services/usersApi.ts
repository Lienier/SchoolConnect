/** Users API calls (admin management surface). */
import { apiClient } from "@/api/client";
import type { UserListResponse, UserStatus } from "@/features/users/types";

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
};
