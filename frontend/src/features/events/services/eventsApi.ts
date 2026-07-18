/** Events + registration API calls. */
import { apiClient } from "@/api/client";
import type {
  EventCategory,
  EventCategoryListResponse,
  EventListResponse,
  Registration,
  RegistrationListResponse,
  SchoolEvent,
} from "@/features/events/types";

export const eventsApi = {
  async list(
    params: { page?: number; status?: string; category_id?: string } = {},
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

  async approve(id: string, decision: "approved" | "rejected", comment?: string) {
    const { data } = await apiClient.post(`/events/${id}/approve`, {
      decision,
      comment,
    });
    return data.data;
  },

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
};
