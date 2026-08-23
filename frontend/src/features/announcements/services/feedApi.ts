/** Public bulletin feed API for the social-style home and dashboard surfaces. */
import { apiClient } from "@/api/client";
import type { FeedItem, FeedListResponse } from "@/features/announcements/types/feed";

export const feedApi = {
  async list(params: { kind?: "all" | "announcements" | "events"; limit?: number } = {}): Promise<{
    data: FeedItem[];
    meta?: FeedListResponse["meta"];
  }> {
    const { data } = await apiClient.get<FeedListResponse>("/feed", { params });
    return { data: data.data, meta: data.meta };
  },
};

