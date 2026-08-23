import { apiClient } from "@/api/client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { Announcement } from "@/features/announcements/types";
import type { Registration, RegistrationListResponse, SchoolEvent } from "@/features/events/types";

export interface ReportDashboard {
  total_events: number;
  upcoming_events: number;
  pending_approvals: number;
  registrations: { total: number; by_status: Record<string, number> };
  popular_categories: { category: string; registrations: number }[];
  department_attendance: { department: string; attended: number; total: number; percentage: number }[];
  attendance: Record<string, number>;
  completed_events: number;
  cancelled_events: number;
}

export interface AuditEntry { id: string; actor_id: string | null; actor_name?: string | null; action: string; entity_type: string; entity_id: string | null; changes: Record<string, unknown> | null; ip_address: string | null; created_at: string; }

export const adminApi = {
  async reportDashboard(): Promise<ReportDashboard> { const { data } = await apiClient.get<ApiResponse<ReportDashboard>>("/reports/dashboard"); return data.data; },
  async auditLogs(page = 1, action?: string): Promise<{ data: AuditEntry[]; meta?: PaginationMeta }> { const { data } = await apiClient.get<ApiResponse<AuditEntry[]>>("/audit/logs", { params: { page, action } }); return { data: data.data, meta: data.meta }; },
  async allRegistrations(page = 1, status?: string): Promise<{ data: Registration[]; meta?: RegistrationListResponse["meta"] }> { const { data } = await apiClient.get<RegistrationListResponse>("/registrations", { params: { page, status, redact: "true" } }); return { data: data.data, meta: data.meta }; },
  async pendingAnnouncements(): Promise<Announcement[]> { const { data } = await apiClient.get<ApiResponse<Announcement[]>>("/announcements", { params: { status: "pending_approval", page_size: 50 } }); return data.data; },
  async pendingEvents(): Promise<SchoolEvent[]> { const { data } = await apiClient.get<ApiResponse<SchoolEvent[]>>("/events", { params: { status: "pending_approval", page_size: 50 } }); return data.data; },
};
