import { apiClient } from "@/api/client";
import type { ApiResponse, PaginationMeta } from "@/types/api";

export interface AttendanceRecord { id: string; event_id: string; user_id: string; registration_id: string | null; status: "present" | "absent" | "excused" | "late"; registration_status?: string; check_in_at: string | null; check_out_at: string | null; method: string; recorded_by: string | null; event_title?: string | null; participant_name?: string | null; recorded_by_name?: string | null; }
export interface QrTokenResponse { token: string; expires_at: string; user_id?: string | null; used?: boolean; qr_data_url?: string | null; }
export const attendanceApi = {
  async list(eventId: string, page = 1) { const { data } = await apiClient.get<ApiResponse<AttendanceRecord[]>>(`/attendance/event/${eventId}`, { params: { page } }); return { data: data.data, meta: data.meta as PaginationMeta | undefined }; },
  async mine(page = 1) { const { data } = await apiClient.get<ApiResponse<AttendanceRecord[]>>("/attendance/mine", { params: { page } }); return { data: data.data, meta: data.meta as PaginationMeta | undefined }; },
  async summary(eventId: string) { const { data } = await apiClient.get<ApiResponse<Record<string, number>>>(`/attendance/event/${eventId}/summary`); return data.data; },
  async mark(eventId: string, userId: string, status: AttendanceRecord["status"]) { const { data } = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/mark", { event_id: eventId, user_id: userId, status }); return data.data; },
  async generateQr(eventId: string, userId?: string) { const { data } = await apiClient.post<ApiResponse<QrTokenResponse>>("/attendance/qr/generate", { event_id: eventId, user_id: userId }); return data.data; },
  async checkIn(token: string) { const { data } = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/qr/check-in", { token }); return data.data; },
};
