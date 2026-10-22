import { isAxiosError } from "axios";

interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: Array<{ msg?: string; message?: string; loc?: (string | number)[] }> | Record<string, unknown>;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<ApiErrorPayload>(error)) return fallback;

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "The server took too long to respond. Please try again.";
  }
  if (error.code === "ERR_NETWORK") {
    return "Unable to connect to the server. Please try again.";
  }

  const payload = error.response?.data;

  if (Array.isArray(payload?.errors)) {
    const first = payload.errors.find((item) => item.msg || item.message);
    if (first?.msg) return `${first.loc?.join(" ").replace(/_/g, " ") || "Validation"}: ${first.msg}`;
    if (first?.message) return first.message;
  }
  if (payload?.message?.trim()) return payload.message;
  if (payload?.error?.trim()) return payload.error;
  if ((error.response?.status ?? 0) >= 500) return "The server is unavailable. Please try again.";
  return fallback;
}
