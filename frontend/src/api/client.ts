/**
 * Central Axios instance.
 *
 * Attaches the access token to every request and transparently refreshes the
 * access token via the refresh-token rotation endpoint when a 401 is received,
 * then retries the original request once.
 */
import axios, { type AxiosInstance } from "axios";

import {
  API_BASE_URL,
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "@/constants";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track in-flight refresh so concurrent 401s share one token swap.
let refreshPromise: Promise<string> | null = null;

async function rotateToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!refreshToken) throw new Error("No refresh token");
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const tokens = data.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
      return tokens.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    ) {
      original._retry = true;
      try {
        const accessToken = await rotateToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    }
    return Promise.reject(error);
  },
);
