/** Auth feature types matching the backend API envelope. */
import type { ApiResponse } from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  status: string;
  email_verified: boolean;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export type LoginResponse = ApiResponse<AuthTokens>;
export type TokenResponse = ApiResponse<AuthTokens>;
export type MeResponse = ApiResponse<AuthUser>;
