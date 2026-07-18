/** Announcements API calls. */
import { apiClient } from "@/api/client";
import type {
  Announcement,
  AnnouncementListResponse,
  AnnouncementCategory,
  CategoryListResponse,
} from "@/features/announcements/types";

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

  async feed(page = 1): Promise<{ data: Announcement[]; meta?: any }> {
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
    submit_for_approval: boolean;
  }): Promise<Announcement> {
    const { data } = await apiClient.post("/announcements", payload);
    return data.data;
  },

  async approve(id: string, decision: "approved" | "rejected", comment?: string) {
    const { data } = await apiClient.post(`/announcements/${id}/approve`, {
      decision,
      comment,
    });
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
