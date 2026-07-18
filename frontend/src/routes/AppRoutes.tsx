/**
 * Central route table with lazy-loaded pages for code splitting.
 *
 * Feature pages are registered here as they are implemented. Each route should
 * be wrapped with the appropriate layout and guard.
 */
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const DashboardPage = lazy(() => import("@/features/auth/pages/DashboardPage"));
const AnnouncementsPage = lazy(
  () => import("@/features/announcements/pages/AnnouncementsPage"),
);
const CreateAnnouncementPage = lazy(
  () => import("@/features/announcements/pages/CreateAnnouncementPage"),
);
const EventsPage = lazy(() => import("@/features/events/pages/EventsPage"));
const CreateEventPage = lazy(
  () => import("@/features/events/pages/CreateEventPage"),
);
const EventDetailPage = lazy(
  () => import("@/features/events/pages/EventDetailPage"),
);
const MyRegistrationsPage = lazy(
  () => import("@/features/events/pages/MyRegistrationsPage"),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-8 text-navy-500">Loading…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements/new"
          element={
            <ProtectedRoute>
              <CreateAnnouncementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <ProtectedRoute>
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrations/mine"
          element={
            <ProtectedRoute>
              <MyRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
