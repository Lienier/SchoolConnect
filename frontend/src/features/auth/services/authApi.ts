/** Auth API calls. Thin layer over the shared Axios client. */
import { apiClient } from "@/api/client";
import type {
  AuthTokens,
  LoginResponse,
  MeResponse,
  TokenResponse,
} from "@/features/auth/types";

export const authApi = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return data.data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<TokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data.data;
  },

  async logout(refreshToken?: string, accessToken?: string): Promise<void> {
    await apiClient.post(
      "/auth/logout",
      { refresh_token: refreshToken },
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    );
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await apiClient.post("/auth/change-password", { current_password, new_password });
  },

  async me(): Promise<MeResponse["data"]> {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data.data;
  },
};
