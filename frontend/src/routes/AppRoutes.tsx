/**
 * Central route table with lazy-loaded pages for code splitting.
 *
 * Feature pages are registered here as they are implemented. Each authenticated
 * area is wrapped with <ProtectedRoute>. Role-specific dashboards live under
 * /admin, /professor, /officer and /student; the legacy /dashboard now redirects
 * to the caller's role dashboard.
 */
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardPathForRoles } from "@/features/dashboards/routeForRole";
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout";
import { ForbiddenPage } from "@/components/ui/ErrorPages";

const HomePage = lazy(() => import("@/pages/HomePage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
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
const StudentProfilePage = lazy(() => import("@/features/users/pages/StudentProfilePage"));
const ReportsPage = lazy(() => import("@/features/admin/pages/AdminSupportPages").then((module) => ({ default: module.ReportsPage })));
const ActivityLogsPage = lazy(() => import("@/features/admin/pages/AdminSupportPages").then((module) => ({ default: module.ActivityLogsPage })));
const AdminRegistrationsPage = lazy(() => import("@/features/admin/pages/AdminSupportPages").then((module) => ({ default: module.AdminRegistrationsPage })));
const SettingsPage = lazy(() => import("@/features/admin/pages/AdminSupportPages").then((module) => ({ default: module.SettingsPage })));
const AttendancePage = lazy(() => import("@/features/attendance/pages/AttendancePage"));
const StudentAttendancePage = lazy(() => import("@/features/attendance/pages/StudentAttendancePage"));
const NotificationsPage = lazy(() => import("@/features/notifications/pages/NotificationsPage"));
const CalendarPage = lazy(() => import("@/features/calendar/pages/CalendarPage"));

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
    <Suspense fallback={<div className="p-8 text-navy-500">Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        >
          {/* Role dashboards */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/professor" element={<TeacherDashboardPage />} />
          <Route path="/teacher" element={<Navigate to="/professor" replace />} />
          <Route path="/officer" element={<OfficerDashboardPage />} />
          <Route path="/student" element={<StudentDashboardPage />} />
          {/* Legacy catch-all: send users to their role dashboard */}
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/announcements/new" element={<ProtectedRoute requiredPermission="announcements.create"><CreateAnnouncementPage /></ProtectedRoute>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<ProtectedRoute requiredPermission="events.create"><CreateEventPage /></ProtectedRoute>} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/registrations/mine" element={<MyRegistrationsPage />} />
          <Route path="/users" element={<ProtectedRoute requiredPermission="users.view"><UsersPage /></ProtectedRoute>} />
          <Route path="/profile" element={<StudentProfilePage />} />
          <Route path="/roles" element={<ProtectedRoute requiredPermission="roles.view"><RolesPage /></ProtectedRoute>} />
          <Route path="/school" element={<ProtectedRoute requiredPermission="departments.view"><SchoolPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><ReportsPage /></ProtectedRoute>} />
          <Route path="/audit/logs" element={<ProtectedRoute requiredPermission="audit.view"><ActivityLogsPage /></ProtectedRoute>} />
          <Route path="/registrations" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student_council", "department_student_leader"]}><AdminRegistrationsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><SettingsPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute requiredPermission="attendance.view"><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/mine" element={<ProtectedRoute allowedRoles={["student"]}><StudentAttendancePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/support" element={<SupportPage />} />
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
