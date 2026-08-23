/** Events + registration API calls. */
import { apiClient } from "@/api/client";
import type {
  EventCategory,
  EventCategoryListResponse,
  EventListResponse,
  EventResult,
  Registration,
  RegistrationListResponse,
  SchoolEvent,
  TeamRegistration,
} from "@/features/events/types";

export const eventsApi = {
  async list(
    params: { page?: number; status?: string; category_id?: string; organizer_id?: string } = {},
  ): Promise<{ data: SchoolEvent[]; meta?: EventListResponse["meta"] }> {
    const { data } = await apiClient.get<EventListResponse>("/events", {
      params,
    });
    return { data: data.data, meta: data.meta };
  },

  async get(id: string): Promise<SchoolEvent> {
    const { data } = await apiClient.get(`/events/${id}`);
    return data.data;
  },

  async create(payload: {
    title: string;
    description?: string;
    category_id?: string;
    start_time: string;
    end_time: string;
    location?: string;
    capacity?: number;
    is_team_event: boolean;
    max_team_size?: number;
    submit_for_approval: boolean;
  }): Promise<SchoolEvent> {
    const { data } = await apiClient.post("/events", payload);
    return data.data;
  },

  async submit(id: string): Promise<SchoolEvent> {
    const { data } = await apiClient.post(`/events/${id}/submit`);
    return data.data;
  },

  async approve(id: string, decision: "approved" | "rejected" | "returned", comment?: string) {
    const { data } = await apiClient.post(`/events/${id}/approve`, {
      decision,
      comment,
    });
    return data.data;
  },

  async changeStatus(id: string, status: SchoolEvent["status"]): Promise<SchoolEvent> {
    const { data } = await apiClient.post(`/events/${id}/status`, { status });
    return data.data;
  },

  async listResults(id: string): Promise<EventResult[]> {
    const { data } = await apiClient.get(`/events/${id}/results`);
    return data.data;
  },

  async createResult(id: string, payload: Omit<EventResult, "id" | "event_id" | "created_by" | "created_at">): Promise<EventResult> {
    const { data } = await apiClient.post(`/events/${id}/results`, payload);
    return data.data;
  },

  async deleteResult(id: string): Promise<void> { await apiClient.delete(`/events/results/${id}`); },

  async updateResult(id: string, payload: Partial<EventResult>): Promise<EventResult> { const { data } = await apiClient.patch(`/events/results/${id}`, payload); return data.data; },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  async listCategories(): Promise<EventCategory[]> {
    const { data } = await apiClient.get<EventCategoryListResponse>(
      "/events/categories/all",
    );
    return data.data;
  },
};

export const registrationsApi = {
  async register(eventId: string, notes?: string): Promise<Registration> {
    const { data } = await apiClient.post("/registrations", {
      event_id: eventId,
      notes,
    });
    return data.data;
  },

  async registerTeam(
    eventId: string,
    name: string,
    memberIds: string[] = [],
  ): Promise<TeamRegistration> {
    const { data } = await apiClient.post("/registrations/team", {
      event_id: eventId,
      name,
      member_ids: memberIds,
    });
    return data.data;
  },

  async joinTeam(teamCode: string): Promise<Registration> {
    const { data } = await apiClient.post("/registrations/team/join", {
      team_code: teamCode,
    });
    return data.data;
  },

  async mine(
    page = 1,
  ): Promise<{ data: Registration[]; meta?: RegistrationListResponse["meta"] }> {
    const { data } = await apiClient.get<RegistrationListResponse>(
      "/registrations/mine",
      { params: { page } },
    );
    return { data: data.data, meta: data.meta };
  },

  async listForEvent(
    eventId: string,
    page = 1,
  ): Promise<{ data: Registration[]; meta?: RegistrationListResponse["meta"] }> {
    const { data } = await apiClient.get<RegistrationListResponse>(
      "/registrations",
      { params: { event_id: eventId, page } },
    );
    return { data: data.data, meta: data.meta };
  },

  async decide(
    id: string,
    decision: "approved" | "rejected",
    notes?: string,
  ): Promise<Registration> {
    const { data } = await apiClient.post(`/registrations/${id}/decide`, {
      decision,
      notes,
    });
    return data.data;
  },

  async cancel(id: string): Promise<Registration> {
    const { data } = await apiClient.post(`/registrations/${id}/cancel`);
    return data.data;
  },
  async promote(id: string): Promise<Registration> { const { data } = await apiClient.post(`/registrations/${id}/promote`); return data.data; },
  async remove(id: string): Promise<void> { await apiClient.delete(`/registrations/${id}`); },
};
