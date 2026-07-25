/**
 * Central route table with lazy-loaded pages for code splitting.
 *
 * Feature pages are registered here as they are implemented. Each authenticated
 * area is wrapped with <ProtectedRoute>. Role-specific dashboards live under
 * /admin, /teacher, /officer and /student; the legacy /dashboard now redirects
 * to the caller's role dashboard.
 */
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardPathForRoles } from "@/features/dashboards/routeForRole";
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
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
const RolesPage = lazy(() => import("@/features/roles/pages/RolesPage"));
const SchoolPage = lazy(() => import("@/features/school/pages/SchoolPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage"));

// Role-specific dashboards (each in its own folder for isolated editing).
const AdminDashboardPage = lazy(
  () => import("@/features/dashboards/admin/DashboardPage"),
);
const TeacherDashboardPage = lazy(
  () => import("@/features/dashboards/teacher/DashboardPage"),
);
const OfficerDashboardPage = lazy(
  () => import("@/features/dashboards/officer/DashboardPage"),
);
const StudentDashboardPage = lazy(
  () => import("@/features/dashboards/student/DashboardPage"),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-8 text-navy-500">Loading…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        >
          {/* Role dashboards */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/teacher" element={<TeacherDashboardPage />} />
          <Route path="/officer" element={<OfficerDashboardPage />} />
          <Route path="/student" element={<StudentDashboardPage />} />
          {/* Legacy catch-all: send users to their role dashboard */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/announcements/new" element={<CreateAnnouncementPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/registrations/mine" element={<MyRegistrationsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/school" element={<SchoolPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/** Redirects an authenticated user from /dashboard to their role dashboard. */
function DashboardRedirect() {
  const { user } = useAuth();
  const path = dashboardPathForRoles(user?.roles);
  return <Navigate to={path} replace />;
}
