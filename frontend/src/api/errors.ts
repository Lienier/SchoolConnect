import { isAxiosError } from "axios";

interface ApiErrorPayload {
  message?: string;
  error?: string;
  errors?: Array<{ msg?: string; message?: string }> | Record<string, unknown>;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<ApiErrorPayload>(error)) return fallback;

  const payload = error.response?.data;
  if (payload?.message?.trim()) return payload.message;
  if (payload?.error?.trim()) return payload.error;
  if (Array.isArray(payload?.errors)) {
    const first = payload.errors.find((item) => item.msg || item.message);
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
  }
  return fallback;
}
