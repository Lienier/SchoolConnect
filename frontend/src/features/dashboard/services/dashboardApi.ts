/** Dashboard stats API calls. */
import { apiClient } from "@/api/client";
import type { ApiResponse } from "@/types/api";

export type DashboardStats = Record<string, number>;

export const dashboardApi = {
  async stats(widgets?: string[]): Promise<DashboardStats> {
    const { data } = await apiClient.get<ApiResponse<DashboardStats>>("/dashboard/stats", {
      params: widgets ? { widgets: widgets.join(",") } : undefined,
    });
    return data.data;
  },
};
