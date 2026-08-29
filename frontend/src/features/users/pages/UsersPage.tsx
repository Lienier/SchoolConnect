/** User management: list, search, filter, and lifecycle actions. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Lock, Plus, Shield, Trash2, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { apiErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { schoolApi } from "@/features/school/services/schoolApi";
import type { Course, Department, Section } from "@/features/school/types";
import { usersApi } from "@/features/users/services/usersApi";
import type { SystemRole, UserListItem, UserStatus } from "@/features/users/types";

const SYSTEM_ROLES: SystemRole[] = ["admin", "teacher", "student_council", "student"];
const roleLabel = (role: string) => {
  if (role === "admin") return "Admin";
  if (role === "teacher") return "Professor";
  if (role === "student_council") return "Student Council";
  if (role === "student") return "Student";
  return role.replace("_", " ");
};
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  active: "success",
  invited: "info",
  inactive: "neutral",
  suspended: "danger",
};

const SC_POSITIONS = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];

const emptyForm = {
  email: "",
  full_name: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  username: "",
  password: "",
  role: "student" as SystemRole,
  roles: ["student"],
  status: "active" as UserStatus,
  student_number: "",
  department_id: "",
  course_id: "",
  section_id: "",
  officer_position: "",
};

export default function UsersPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [rolesTarget, setRolesTarget] = useState<UserListItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ user: UserListItem; action: "disable" | "reactivate" | "suspend" | "delete" } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["student"]);

  const usersQuery = useQuery({
    queryKey: ["users", page, search, status, role],
    queryFn: () => usersApi.list({ page, search: search || undefined, status: (status || undefined) as UserStatus | undefined, role: role || undefined }),
  });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: usersApi.roles, enabled: can("roles.view") });
  const departmentsQuery = useQuery({ queryKey: ["school", "departments", "all"], queryFn: () => schoolApi.listDepartments({ page_size: 100 }), enabled: createOpen });
  const coursesQuery = useQuery({ queryKey: ["school", "courses", "all"], queryFn: () => schoolApi.listCourses({ page_size: 100 }), enabled: createOpen });
  const sectionsQuery = useQuery({ queryKey: ["school", "sections", "all"], queryFn: () => schoolApi.listSections({ page_size: 100 }), enabled: createOpen });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });
  const roleOptions = rolesQuery.data?.map((r) => r.name) ?? SYSTEM_ROLES;

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (_data, variables) => {
      toast(`User created: ${variables.full_name}.`, "success");
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "User could not be created."), "error"),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; payload: { full_name?: string; username?: string | null; status?: UserStatus } }) => usersApi.update(args.id, args.payload),
    onSuccess: () => {
      toast(`User updated: ${editTarget?.full_name ?? "account"}.`, "success");
      setEditTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "User could not be updated."), "error"),
  });

  const rolesMut = useMutation({
    mutationFn: (args: { id: string; roles: string[] }) => usersApi.assignRoles(args.id, args.roles),
    onSuccess: () => {
      toast(`Roles updated for ${rolesTarget?.full_name ?? "user"}.`, "success");
      setRolesTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Roles could not be updated."), "error"),
  });

  const lifecycle = useMutation({
    mutationFn: async (args: { id: string; action: "disable" | "reactivate" | "suspend" | "delete" }) => {
      if (args.action === "disable") await usersApi.disable(args.id);
      else if (args.action === "reactivate") await usersApi.reactivate(args.id);
      else if (args.action === "suspend") await usersApi.suspend(args.id);
      else await usersApi.delete(args.id);
    },
    onSuccess: (_data, variables) => {
      const name = confirmTarget?.user.full_name ?? "User";
      const actionLabel = variables.action === "reactivate" ? "reactivated" : variables.action === "delete" ? "deleted" : variables.action === "disable" ? "disabled" : "suspended";
      toast(`${name} ${actionLabel}.`, "success");
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Action failed."), "error"),
  });

  const resetMut = useMutation({
    mutationFn: (args: { id: string; password: string }) => usersApi.resetPassword(args.id, args.password),
    onSuccess: () => {
      toast(`Password reset for ${resetTarget?.full_name ?? "user"}.`, "success");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Reset failed."), "error"),
  });

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const departments = departmentsQuery.data?.data ?? [];
  const courses = coursesQuery.data?.data ?? [];
  const sections = sectionsQuery.data?.data ?? [];
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setCreateOpen(true);
  };
  const openEdit = (user: UserListItem) => {
    setEditTarget(user);
    setForm({
      ...emptyForm,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name ?? "",
      middle_name: user.middle_name ?? "",
      last_name: user.last_name ?? "",
      username: user.username ?? "",
      password: "",
      roles: user.roles,
      role: (user.roles[0] as SystemRole | undefined) ?? "student",
      status: user.status as UserStatus,
    });
  };
  const openRoles = (user: UserListItem) => {
    setRolesTarget(user);
    setSelectedRoles(user.roles.length ? user.roles : ["student"]);
  };
  const toggleRole = (roleName: string) => {
    setSelectedRoles((current) => current.includes(roleName) ? current.filter((item) => item !== roleName) : [...current, roleName]);
  };
  const createPayload = () => {
    const fullName = buildFullName(form.first_name, form.middle_name, form.last_name);
    return {
      email: form.email.trim(),
      full_name: fullName,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || undefined,
      last_name: form.last_name.trim(),
      username: generatedUsername(form),
      password: form.password,
      role: form.role,
      roles: [form.role],
      status: "active" as UserStatus,
      student_number: needsStudentNumber(form.role) ? form.student_number.trim() : undefined,
      department_id: form.department_id || undefined,
      course_id: form.course_id || undefined,
      section_id: form.section_id || undefined,
      officer_position: form.role === "student_council" ? form.officer_position : undefined,
    };
  };
  const canCreate = isCreateFormValid(form);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#102858]">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage accounts, roles, and access across the college community.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="search" placeholder="Search name / email / username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full sm:w-72" />
          {can("users.create") && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add User</Button>}
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {roleOptions.map((item) => <SelectItem key={item} value={item}>{roleLabel(item)}</SelectItem>)}
            </SelectContent>
          </Select>
          {usersQuery.isError && <Button variant="secondary" onClick={() => usersQuery.refetch()}>Retry loading users</Button>}
        </div>

        <Table>
          <THead><TR><TH>Name</TH><TH>Email</TH><TH>Roles</TH><TH>Status</TH><TH>Last Login</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">{u.full_name}</TD>
                <TD title={u.email}>{maskedEmail(u.email)}</TD>
                <TD><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="info">{roleLabel(r)}</Badge>)}</div></TD>
                <TD><Badge tone={STATUS_TONE[u.status] ?? "neutral"}>{u.status}</Badge></TD>
                <TD className="text-navy-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "-"}</TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    {can("users.update") && <Button size="sm" variant="secondary" onClick={() => openEdit(u)}><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit</Button>}
                    {can("users.manage_roles") && <Button size="sm" variant="secondary" onClick={() => openRoles(u)}><Shield className="mr-1.5 h-3.5 w-3.5" />Roles</Button>}
                    {can("users.update") && u.status === "active" && <Button size="sm" variant="secondary" onClick={() => setConfirmTarget({ user: u, action: "disable" })}><UserX className="mr-1.5 h-3.5 w-3.5" />Disable</Button>}
                    {can("users.update") && u.status === "active" && <Button size="sm" variant="secondary" onClick={() => setConfirmTarget({ user: u, action: "suspend" })}><UserX className="mr-1.5 h-3.5 w-3.5" />Suspend</Button>}
                    {can("users.update") && ["suspended", "inactive", "invited"].includes(u.status) && <Button size="sm" variant="secondary" onClick={() => setConfirmTarget({ user: u, action: "reactivate" })}><UserCheck className="mr-1.5 h-3.5 w-3.5" />Reactivate</Button>}
                    {can("users.update") && <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)}><Lock className="mr-1.5 h-3.5 w-3.5" />Reset PW</Button>}
                    {can("users.delete") && <Button size="sm" variant="danger" onClick={() => setConfirmTarget({ user: u, action: "delete" })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
                  </div>
                </TD>
              </TR>
            ))}
            {!usersQuery.isLoading && users.length === 0 && <TR><td colSpan={6} className="py-8 text-center text-navy-500">No users found.</td></TR>}
            {usersQuery.isLoading && <TR><td colSpan={6} className="py-8 text-center text-navy-500">Loading users...</td></TR>}
          </TBody>
        </Table>

        {meta && <div className="mt-4 flex items-center justify-between text-sm text-navy-600"><span>Page {meta.page} of {meta.total_pages}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
      </Card>

      <Modal open={createOpen} title="Create user" onClose={() => setCreateOpen(false)} className="max-w-2xl" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button isLoading={createMut.isPending} disabled={!canCreate} onClick={() => createMut.mutate(createPayload(), { onSuccess: () => setCreateOpen(false) })}>Create</Button></>}>
        <CreateUserForm
          form={form}
          setForm={setForm}
          departments={departments}
          courses={courses}
          sections={sections}
          loadingSchoolStructure={departmentsQuery.isLoading || coursesQuery.isLoading || sectionsQuery.isLoading}
        />
      </Modal>

      <Modal open={!!editTarget} title={`Edit ${editTarget?.full_name ?? "user"}`} onClose={() => setEditTarget(null)} footer={<><Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button><Button isLoading={updateMut.isPending} onClick={() => editTarget && updateMut.mutate({ id: editTarget.id, payload: { full_name: form.full_name, username: form.username || null, status: form.status } })}>Save</Button></>}>
        <UserForm form={form} setForm={setForm} roleOptions={roleOptions} editMode />
      </Modal>

      <ConfirmActionModal
        open={!!rolesTarget}
        title="Assign roles"
        description="This will replace the user's current role assignments and immediately change their access after the next refresh."
        itemName={rolesTarget?.full_name}
        confirmLabel="Update Roles"
        isLoading={rolesMut.isPending}
        confirmDisabled={!selectedRoles.length}
        onCancel={() => setRolesTarget(null)}
        onConfirm={() => rolesTarget && rolesMut.mutate({ id: rolesTarget.id, roles: selectedRoles })}
      >
        <div className="grid gap-2 sm:grid-cols-2">{roleOptions.map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selectedRoles.includes(item)} onChange={() => toggleRole(item)} />{roleLabel(item)}</label>)}</div>
      </ConfirmActionModal>

      <ConfirmActionModal
        open={!!resetTarget}
        title="Reset password"
        description="This will replace the user's current password. Share the new password securely after the reset succeeds."
        itemName={resetTarget?.full_name}
        confirmLabel="Reset Password"
        confirmVariant="danger"
        isLoading={resetMut.isPending}
        confirmDisabled={newPassword.length < 8}
        onCancel={() => setResetTarget(null)}
        onConfirm={() => resetTarget && resetMut.mutate({ id: resetTarget.id, password: newPassword })}
      >
        <Input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        {newPassword.length > 0 && newPassword.length < 8 && <p className="text-xs text-red-600">Password must be at least 8 characters.</p>}
      </ConfirmActionModal>

      <ConfirmActionModal
        open={!!confirmTarget}
        title="Confirm account action"
        description={confirmTarget ? accountActionDescription(confirmTarget.action) : ""}
        itemName={confirmTarget?.user.full_name}
        confirmLabel={confirmTarget ? accountActionLabel(confirmTarget.action) : "Confirm"}
        confirmVariant={confirmTarget?.action === "reactivate" ? "primary" : "danger"}
        isLoading={lifecycle.isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) lifecycle.mutate({ id: confirmTarget.user.id, action: confirmTarget.action }, { onSettled: () => setConfirmTarget(null) });
        }}
      />
    </div>
  );
}

function accountActionLabel(action: "disable" | "reactivate" | "suspend" | "delete") {
  if (action === "disable") return "Disable";
  if (action === "reactivate") return "Reactivate";
  if (action === "suspend") return "Suspend";
  return "Delete";
}

function accountActionDescription(action: "disable" | "reactivate" | "suspend" | "delete") {
  if (action === "reactivate") return "This will restore account access according to the user's assigned roles.";
  if (action === "delete") return "This will remove the account from active user management. Historical records may remain for audit purposes.";
  if (action === "disable") return "This will prevent the user from using the account until it is reactivated.";
  return "This will suspend the account and block access until an administrator reactivates it.";
}

function CreateUserForm({
  form,
  setForm,
  departments,
  courses,
  sections,
  loadingSchoolStructure,
}: {
  form: typeof emptyForm;
  setForm: (form: typeof emptyForm) => void;
  departments: Department[];
  courses: Course[];
  sections: Section[];
  loadingSchoolStructure: boolean;
}) {
  const filteredCourses = courses.filter((course) => !form.department_id || course.department_id === form.department_id);
  const filteredSections = sections.filter((section) => !form.course_id || section.course_id === form.course_id);
  const setRole = (roleName: SystemRole) => {
    setForm({
      ...form,
      role: roleName,
      roles: [roleName],
      student_number: needsStudentNumber(roleName) ? form.student_number : "",
      department_id: roleName === "student" || roleName === "student_council" || roleName === "teacher" ? form.department_id : "",
      course_id: roleName === "student" || roleName === "student_council" ? form.course_id : "",
      section_id: roleName === "student" || roleName === "student_council" ? form.section_id : "",
      officer_position: roleName === "student_council" ? form.officer_position : "",
    });
  };
  const setDepartment = (department_id: string) => {
    setForm({ ...form, department_id, course_id: "", section_id: "" });
  };
  const setCourse = (course_id: string) => {
    setForm({ ...form, course_id, section_id: "" });
  };
  const username = generatedUsername(form);

  return (
    <div className="space-y-4">
      <Select value={form.role} onValueChange={(value) => setRole(value as SystemRole)}>
        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
        <SelectContent>
          {SYSTEM_ROLES.map((item) => <SelectItem key={item} value={item}>{roleLabel(item)}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="grid gap-3 sm:grid-cols-2">
        <FloatingInput label="First name" value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
        <FloatingInput label="Last name" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
      </div>
      <FloatingInput label="Middle name (optional)" value={form.middle_name} onChange={(value) => setForm({ ...form, middle_name: value })} />
      <FloatingInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
      <FloatingInput label="Temporary password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />

      {needsStudentNumber(form.role) && (
        <FloatingInput label="Student ID number" value={form.student_number} onChange={(value) => setForm({ ...form, student_number: value, username: value })} />
      )}

      {(form.role === "student" || form.role === "student_council" || form.role === "teacher") && (
        <Select value={form.department_id} onValueChange={setDepartment} disabled={loadingSchoolStructure}>
          <SelectTrigger><SelectValue placeholder={loadingSchoolStructure ? "Loading departments..." : "Department"} /></SelectTrigger>
          <SelectContent>
            {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.code} - {department.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {(form.role === "student" || form.role === "student_council") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={form.course_id} onValueChange={setCourse} disabled={!form.department_id || loadingSchoolStructure}>
            <SelectTrigger><SelectValue placeholder={!form.department_id ? "Select department first" : "Course"} /></SelectTrigger>
            <SelectContent>
              {filteredCourses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.section_id} onValueChange={(value) => setForm({ ...form, section_id: value })} disabled={!form.course_id || loadingSchoolStructure}>
            <SelectTrigger><SelectValue placeholder={!form.course_id ? "Select course first" : "Section (optional)"} /></SelectTrigger>
            <SelectContent>
              {filteredSections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {form.role === "student_council" && (
        <Select value={form.officer_position} onValueChange={(value) => setForm({ ...form, officer_position: value })}>
          <SelectTrigger><SelectValue placeholder="Student Council role" /></SelectTrigger>
          <SelectContent>
            {SC_POSITIONS.map((position) => <SelectItem key={position} value={position}>{position}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300">
        Username: <span className="font-semibold text-navy-900 dark:text-white">{username || "Generated after ID or email is entered"}</span>
      </div>
    </div>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="group relative block">
      <input
        type={type}
        value={value}
        placeholder=" "
        onChange={(event) => onChange(event.target.value)}
        className="peer h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pb-1 pt-5 text-sm text-navy-900 outline-none transition focus:ring-2 focus:ring-navy-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100 dark:focus:ring-blue-700"
      />
      <span className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-semibold text-slate-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-blue-700 dark:text-navy-400 dark:peer-placeholder-shown:text-navy-500 dark:peer-focus:text-blue-300">
        {label}
      </span>
    </label>
  );
}

function middleInitials(middleName: string) {
  const parts = middleName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0][0].toUpperCase()}.`;
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function buildFullName(firstName: string, middleName: string, lastName: string) {
  return [firstName.trim(), middleInitials(middleName), lastName.trim()].filter(Boolean).join(" ");
}

function needsStudentNumber(roleName: SystemRole) {
  return roleName === "student" || roleName === "student_council";
}

function generatedUsername(form: typeof emptyForm) {
  if (needsStudentNumber(form.role)) return form.student_number.trim();
  return form.email.split("@", 1)[0].trim();
}

function maskedEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!domain) return email.slice(0, 3);
  return `${localPart.slice(0, 3)}***@${domain}`;
}

function isCreateFormValid(form: typeof emptyForm) {
  if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim() || form.password.length < 8) return false;
  if (needsStudentNumber(form.role) && !form.student_number.trim()) return false;
  if (form.role === "teacher" && !form.department_id) return false;
  if (form.role === "student_council" && !form.officer_position) return false;
  return true;
}

function UserForm({ form, setForm, roleOptions, includePassword = false, editMode = false }: {
  form: typeof emptyForm;
  setForm: (form: typeof emptyForm) => void;
  roleOptions: string[];
  includePassword?: boolean;
  editMode?: boolean;
}) {
  const toggleRole = (roleName: string) => {
    setForm({ ...form, roles: form.roles.includes(roleName) ? form.roles.filter((item) => item !== roleName) : [...form.roles, roleName] });
  };

  return (
    <div className="space-y-3">
      {!editMode && <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
      <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      {includePassword && <Input type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as UserStatus })}>
        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="invited">Invited</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
      {!editMode && <div className="grid gap-2 sm:grid-cols-2">{roleOptions.map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.roles.includes(item)} onChange={() => toggleRole(item)} />{roleLabel(item)}</label>)}</div>}
    </div>
  );
}
