/** Roles + permissions API calls. */
import { apiClient } from "@/api/client";
import type {
  PermissionListResponse,
  Role,
  RoleListResponse,
} from "@/features/roles/types";

export const rolesApi = {
  async list(
    params: { page?: number; search?: string; sort?: string } = {},
  ): Promise<{ data: Role[]; meta?: RoleListResponse["meta"] }> {
    const { data } = await apiClient.get<RoleListResponse>("/roles", { params });
    return { data: data.data, meta: data.meta };
  },

  async get(id: string): Promise<Role> {
    const { data } = await apiClient.get(`/roles/${id}`);
    return data.data;
  },

  async listPermissions(): Promise<PermissionListResponse["data"]> {
    const { data } = await apiClient.get<PermissionListResponse>("/roles/permissions");
    return data.data;
  },

  async create(payload: {
    name: string;
    display_name: string;
    description?: string | null;
    priority?: number | null;
    permissions?: string[];
  }): Promise<Role> {
    const { data } = await apiClient.post<{ data: Role }>("/roles", payload);
    return data.data;
  },

  async update(
    id: string,
    payload: { display_name?: string; description?: string | null; priority?: number | null },
  ): Promise<Role> {
    const { data } = await apiClient.patch<{ data: Role }>(`/roles/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },

  async assignPermissions(id: string, permissions: string[]): Promise<Role> {
    const { data } = await apiClient.put<{ data: Role }>(
      `/roles/${id}/permissions`,
      { permissions },
    );
    return data.data;
  },

  async clone(id: string, payload: { name: string; display_name: string; description?: string | null }): Promise<Role> {
    const { data } = await apiClient.post<{ data: Role }>(
      `/roles/${id}/clone`,
      payload,
    );
    return data.data;
  },
};
