/** Auth API calls. Thin layer over the shared Axios client. */
import { apiClient } from "@/api/client";
import type {
  AuthTokens,
  LoginResponse,
  MeResponse,
  RegisterResponse,
} from "@/features/auth/types";

export const authApi = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return data.data;
  },

  async register(payload: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<AuthTokens> {
    const { data } = await apiClient.post<RegisterResponse>(
      "/auth/register",
      payload,
    );
    return data.data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<RegisterResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post("/auth/logout", { refresh_token: refreshToken });
  },

  async me(): Promise<MeResponse["data"]> {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data.data;
  },
};
