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
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track in-flight refresh so concurrent 401s share one token swap.
let refreshPromise: { token: string; promise: Promise<string> } | null = null;

async function rotateToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) throw new Error("No refresh token");
  if (!refreshPromise || refreshPromise.token !== refreshToken) {
    const promise = (async () => {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const tokens = data.data;
      if (localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) !== refreshToken) {
        throw new Error("Session changed during refresh");
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
      window.dispatchEvent(new Event("schoolconnect:token-refreshed"));
      return tokens.access_token;
    })().finally(() => {
      if (refreshPromise?.token === refreshToken) refreshPromise = null;
    });
    refreshPromise = { token: refreshToken, promise };
  }
  return refreshPromise.promise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !["/auth/login", "/auth/logout", "/auth/refresh", "/auth/change-password"].includes(original.url) &&
      !original._retry &&
      localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    ) {
      original._retry = true;
      const sessionToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      try {
        const accessToken = await rotateToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        if (localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) === sessionToken) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          window.dispatchEvent(new Event("schoolconnect:session-expired"));
        }
      }
    }
    return Promise.reject(error);
  },
);
