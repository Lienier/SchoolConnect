/** Account details and student college-profile completion workflow. */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Building2, GraduationCap, Mail, Phone, ShieldCheck, UserRound, Users } from "lucide-react";

import { apiErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader, StatusBadge } from "@/components/ui/AdminPrimitives";
import { useAuth } from "@/features/auth/context/AuthContext";
import { schoolApi } from "@/features/school/services/schoolApi";
import { usersApi } from "@/features/users/services/usersApi";
import { useToast } from "@/providers/ToastProvider";

export default function StudentProfilePage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectionOverride, setSelectionOverride] = useState<{
    department_id: string;
    course_id: string;
    section_id: string;
  } | null>(null);
  const isStudent = Boolean(authUser?.roles.some((role) => ["student", "student_council"].includes(role)));
  const profile = useQuery({ queryKey: ["users", "me", "profile"], queryFn: usersApi.getMyProfile });
  const collegeProfile = useQuery({
    queryKey: ["users", "me", "student-profile"],
    queryFn: usersApi.getMyStudentProfile,
    enabled: isStudent,
  });
  const departments = useQuery({ queryKey: ["college", "departments", "profile"], queryFn: () => schoolApi.listDepartments({ page_size: 100 }), enabled: isStudent });
  const courses = useQuery({ queryKey: ["college", "courses", "profile"], queryFn: () => schoolApi.listCourses({ page_size: 250 }), enabled: isStudent });
  const sections = useQuery({ queryKey: ["college", "sections", "profile"], queryFn: () => schoolApi.listSections({ page_size: 250 }), enabled: isStudent });

  const selection = selectionOverride ?? {
      department_id: collegeProfile.data?.department_id ?? "",
      course_id: collegeProfile.data?.course_id ?? "",
      section_id: collegeProfile.data?.section_id ?? "",
    };

  const availableCourses = useMemo(
    () => (courses.data?.data ?? []).filter((course) => course.department_id === selection.department_id),
    [courses.data?.data, selection.department_id],
  );
  const availableSections = useMemo(
    () => (sections.data?.data ?? []).filter((section) => section.course_id === selection.course_id),
    [sections.data?.data, selection.course_id],
  );
  const saveCollegeProfile = useMutation({
    mutationFn: () => usersApi.updateMyStudentProfile(selection),
    onSuccess: () => {
      toast("College profile completed.", "success");
      queryClient.invalidateQueries({ queryKey: ["users", "me", "student-profile"] });
    },
    onError: (error) => toast(apiErrorMessage(error, "College profile could not be saved."), "error"),
  });
  const user = profile.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Review your account and college details." />
      {profile.isLoading && <Card className="border-slate-200 p-6 text-sm text-slate-500 shadow-sm">Loading profile...</Card>}
      {profile.isError && <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">Could not load your profile right now.</Card>}

      {user && (
        <>
          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><UserRound className="h-8 w-8" /></div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-semibold text-[#102858] dark:text-white">{user.full_name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.roles.map((role) => <StatusBadge key={role} tone="info">{role.replace("_", " ")}</StatusBadge>)}
                  <StatusBadge tone={user.status === "active" ? "success" : "warning"}>{user.status}</StatusBadge>
                </div>
              </div>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileField icon={Mail} label="Email" value={user.email} />
            <ProfileField icon={Phone} label="Phone" value={user.phone ?? "Not provided"} />
            <ProfileField icon={UserRound} label="Username" value={user.username ?? "Not provided"} />
            <ProfileField icon={ShieldCheck} label="Email Verified" value={user.email_verified ? "Verified" : "Not verified"} />
          </div>
        </>
      )}

      {isStudent && (
        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-[#102858] dark:text-white">College Profile</h2><p className="mt-1 text-sm text-slate-500 dark:text-navy-300">Complete these details before registering for an event.</p></div>
            {collegeProfile.data && <StatusBadge tone={collegeProfile.data.profile_completed ? "success" : "warning"}>{collegeProfile.data.profile_completed ? "Complete" : "Incomplete"}</StatusBadge>}
          </div>
          {collegeProfile.isError && <p className="mt-4 text-sm text-red-600">Could not load your college profile.</p>}
          {collegeProfile.data && (
            <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); saveCollegeProfile.mutate(); }}>
              <ProfileField icon={GraduationCap} label="Student ID" value={collegeProfile.data.student_number ?? "Not assigned"} />
              <div className="grid gap-4 md:grid-cols-3">
                <ProfileSelect icon={Building2} label="Department" value={selection.department_id} onChange={(value) => setSelectionOverride({ department_id: value, course_id: "", section_id: "" })} options={(departments.data?.data ?? []).map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))} />
                <ProfileSelect icon={BookOpen} label="Course" value={selection.course_id} disabled={!selection.department_id} onChange={(value) => setSelectionOverride({ ...selection, course_id: value, section_id: "" })} options={availableCourses.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))} />
                <ProfileSelect icon={Users} label="Section" value={selection.section_id} disabled={!selection.course_id} onChange={(value) => setSelectionOverride({ ...selection, section_id: value })} options={availableSections.map((item) => ({ value: item.id, label: item.name }))} />
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={!selection.department_id || !selection.course_id || !selection.section_id || saveCollegeProfile.isPending}>{saveCollegeProfile.isPending ? "Saving..." : "Save College Profile"}</Button></div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}

function ProfileField({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return <Card className="flex items-center gap-3 border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[#102858] dark:bg-navy-900 dark:text-navy-200"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-navy-500">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-[#102858] dark:text-white">{value}</span></span></Card>;
}

function ProfileSelect({ icon: Icon, label, value, options, onChange, disabled = false }: { icon: typeof Building2; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#102858] dark:text-white"><Icon className="h-4 w-4" />{label}</span><select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#102858] disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:disabled:bg-navy-950" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
