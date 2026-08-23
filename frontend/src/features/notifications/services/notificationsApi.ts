import { apiClient } from "@/api/client";
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface NotificationItem { id: string; title: string; body: string; category: string; status: "unread" | "read" | "archived"; entity_type: string | null; entity_id: string | null; created_at: string; }
export const notificationsApi = {
  async list(page = 1, status?: string) { const { data } = await apiClient.get<ApiResponse<NotificationItem[]>>("/notifications", { params: { page, status } }); return { data: data.data, meta: data.meta as PaginationMeta | undefined }; },
  async unreadCount() { const { data } = await apiClient.get<ApiResponse<{ unread: number }>>("/notifications/unread-count"); return data.data.unread; },
  async markRead(id: string) { await apiClient.post(`/notifications/${id}/read`); },
  async markAllRead() { await apiClient.post("/notifications/read-all"); },
};
