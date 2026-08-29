/** Announcements API calls. */
import { apiClient } from "@/api/client";
import type {
  Announcement,
  AnnouncementListResponse,
  AnnouncementCategory,
  CategoryListResponse,
} from "@/features/announcements/types";
import type { PaginationMeta } from "@/types/api";

export const announcementsApi = {
  async list(params: { page?: number; status?: string } = {}): Promise<{
    data: Announcement[];
    meta?: AnnouncementListResponse["meta"];
  }> {
    const { data } = await apiClient.get<AnnouncementListResponse>(
      "/announcements",
      { params },
    );
    return { data: data.data, meta: data.meta };
  },

  async feed(page = 1): Promise<{ data: Announcement[]; meta?: PaginationMeta }> {
    const { data } = await apiClient.get<AnnouncementListResponse>(
      "/announcements/feed",
      { params: { page } },
    );
    return { data: data.data, meta: data.meta };
  },

  async get(id: string): Promise<Announcement> {
    const { data } = await apiClient.get(`/announcements/${id}`);
    return data.data;
  },

  async create(payload: {
    title: string;
    body: string;
    summary?: string;
    category_id?: string;
    priority: string;
  }): Promise<Announcement> {
    const { data } = await apiClient.post("/announcements", payload);
    return data.data;
  },

  async archive(id: string): Promise<Announcement> {
    const { data } = await apiClient.post(`/announcements/${id}/archive`);
    return data.data;
  },

  async update(id: string, payload: Partial<Pick<Announcement, "title" | "body" | "summary" | "priority" | "status" | "is_pinned" | "is_emergency" | "target_audience">> & { category_id?: string | null }): Promise<Announcement> {
    const { data } = await apiClient.patch(`/announcements/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/announcements/${id}`);
  },

  async listCategories(): Promise<AnnouncementCategory[]> {
    const { data } = await apiClient.get<CategoryListResponse>(
      "/announcements/categories/all",
    );
    return data.data;
  },
};
