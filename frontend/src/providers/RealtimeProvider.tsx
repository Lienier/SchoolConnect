/** Realtime Socket.IO bridge: listens for backend mutations and refreshes cached data. */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL, TOKEN_STORAGE_KEY } from "@/constants";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/providers/ToastProvider";

interface RealtimeUpdate {
  topic: "announcement" | "event" | "registration" | "attendance" | "notification" | string;
  action: string;
  entity_id?: string | null;
  message?: string | null;
  data?: Record<string, unknown>;
}

function socketBaseUrl() {
  if (API_BASE_URL.startsWith("http")) {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
}

const queryKeysByTopic: Record<string, string[]> = {
  announcement: ["announcements", "announcements-management", "feed", "home-feed", "approvals", "dashboard", "admin"],
  event: ["events", "event", "event-results", "event-categories", "feed", "home-feed", "calendar-events", "approvals", "dashboard", "student-dashboard", "professor", "admin"],
  registration: ["registrations", "my-registrations", "event-registrations", "events", "dashboard", "student-dashboard", "professor", "admin", "reports"],
  attendance: ["attendance", "attendance-mine", "attendance-events", "attendance-summary", "dashboard", "student-dashboard", "professor", "admin", "reports"],
  notification: ["notifications", "notifications-unread", "dashboard"],
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!isAuthenticated || !token) return undefined;

    const socket: Socket = io(socketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("schoolconnect:update", (payload: RealtimeUpdate) => {
      const keys = queryKeysByTopic[payload.topic] ?? ["dashboard"];
      keys.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: [key] });
      });

      if (payload.message && payload.topic === "notification") {
        toast(payload.message, "info");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient, toast]);

  return children;
}
