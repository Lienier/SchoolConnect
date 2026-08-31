/** User management: list, search, filter, and lifecycle actions. */
import { useState, type Dispatch, type SetStateAction } from "react";
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
import type { Course, Department, Organization, Section } from "@/features/school/types";
import { usersApi } from "@/features/users/services/usersApi";
import type { SystemRole, UserListItem, UserStatus } from "@/features/users/types";

const SYSTEM_ROLES: SystemRole[] = ["admin", "teacher", "student_council", "department_student_leader", "student"];
const roleLabel = (role: string) => {
  if (role === "admin") return "Admin";
  if (role === "teacher") return "Professor";
  if (role === "student_council") return "Student Council";
  if (role === "department_student_leader") return "Department Student Leader";
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
const DEPARTMENT_LEADER_POSITIONS = ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];

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
const emptyRoleDetails = {
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
  const [roleDetails, setRoleDetails] = useState(emptyRoleDetails);

  const usersQuery = useQuery({
    queryKey: ["users", page, search, status, role],
    queryFn: () => usersApi.list({ page, search: search || undefined, status: (status || undefined) as UserStatus | undefined, role: role || undefined }),
  });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: usersApi.roles, enabled: can("roles.view") });
  const needsStructure = createOpen || Boolean(rolesTarget);
  const departmentsQuery = useQuery({ queryKey: ["school", "departments", "all"], queryFn: () => schoolApi.listDepartments({ page_size: 100 }), enabled: needsStructure });
  const coursesQuery = useQuery({ queryKey: ["school", "courses", "all"], queryFn: () => schoolApi.listCourses({ page_size: 100 }), enabled: needsStructure });
  const sectionsQuery = useQuery({ queryKey: ["school", "sections", "all"], queryFn: () => schoolApi.listSections({ page_size: 100 }), enabled: needsStructure });
  const organizationsQuery = useQuery({ queryKey: ["school", "organizations", "all"], queryFn: () => schoolApi.listOrganizations({ page_size: 250 }), enabled: needsStructure });

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
    mutationFn: (args: { id: string; payload: Parameters<typeof usersApi.assignRoles>[1] }) => usersApi.assignRoles(args.id, args.payload),
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
  const organizations = organizationsQuery.data?.data ?? [];
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
    setRoleDetails({ ...emptyRoleDetails, student_number: user.username ?? "" });
  };
  const toggleRole = (roleName: string) => {
    setSelectedRoles((current) => {
      const isSelected = current.includes(roleName);
      if (roleName === "student" && isSelected && current.some(isOfficerRole)) return current;
      if (isOfficerRole(roleName)) {
        if (isSelected) return current.filter((item) => item !== roleName);
        return Array.from(new Set([...current.filter((item) => !isOfficerRole(item)), roleName, "student"]));
      }
      return isSelected ? current.filter((item) => item !== roleName) : [...current, roleName];
    });
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
      officer_position: isOfficerRole(form.role) ? form.officer_position.trim() : undefined,
    };
  };
  const canCreate = isCreateFormValid(form, organizations);

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
          organizations={organizations}
          loadingSchoolStructure={departmentsQuery.isLoading || coursesQuery.isLoading || sectionsQuery.isLoading || organizationsQuery.isLoading}
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
        confirmDisabled={!canUpdateRoles(selectedRoles, roleDetails, organizations)}
        onCancel={() => setRolesTarget(null)}
        onConfirm={() => rolesTarget && rolesMut.mutate({ id: rolesTarget.id, payload: roleAssignmentPayload(selectedRoles, roleDetails) })}
      >
        <RoleAssignmentFields
          roleOptions={roleOptions}
          selectedRoles={selectedRoles}
          toggleRole={toggleRole}
          details={roleDetails}
          setDetails={setRoleDetails}
          departments={departments}
          courses={courses}
          sections={sections}
          organizations={organizations}
        />
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
  organizations,
  loadingSchoolStructure,
}: {
  form: typeof emptyForm;
  setForm: (form: typeof emptyForm) => void;
  departments: Department[];
  courses: Course[];
  sections: Section[];
  organizations: Organization[];
  loadingSchoolStructure: boolean;
}) {
  const filteredCourses = courses.filter((course) => !form.department_id || course.department_id === form.department_id);
  const filteredSections = sections.filter((section) => !form.course_id || section.course_id === form.course_id);
  const studentCouncil = organizations.find((organization) => organization.organization_type === "student_council");
  const departmentLeaders = organizations.find((organization) => organization.department_id === form.department_id && organization.organization_type === "department_student_leaders");
  const setRole = (roleName: SystemRole) => {
    setForm({
      ...form,
      role: roleName,
      roles: [roleName],
      student_number: needsStudentNumber(roleName) ? form.student_number : "",
      department_id: roleName === "student" || isOfficerRole(roleName) || roleName === "teacher" ? form.department_id : "",
      course_id: roleName === "student" || isOfficerRole(roleName) ? form.course_id : "",
      section_id: roleName === "student" || isOfficerRole(roleName) ? form.section_id : "",
      officer_position: isOfficerRole(roleName) ? form.officer_position : "",
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

      {(form.role === "student" || isOfficerRole(form.role) || form.role === "teacher") && (
        <Select value={form.department_id} onValueChange={setDepartment} disabled={loadingSchoolStructure}>
          <SelectTrigger><SelectValue placeholder={loadingSchoolStructure ? "Loading departments..." : "Department"} /></SelectTrigger>
          <SelectContent>
            {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.code} - {department.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {(form.role === "student" || isOfficerRole(form.role)) && (
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

      {isOfficerRole(form.role) && (
        <div className="space-y-2">
          <PositionInput
            label={form.role === "student_council" ? "Student Council position" : "Department leader position"}
            value={form.officer_position}
            onChange={(value) => setForm({ ...form, officer_position: value })}
            suggestions={form.role === "student_council" ? SC_POSITIONS : DEPARTMENT_LEADER_POSITIONS}
          />
          <p className={(form.role === "student_council" ? studentCouncil : departmentLeaders) ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>
            {form.role === "student_council"
              ? studentCouncil
                ? `Council: ${studentCouncil.name}`
                : "Create the college-wide Student Council organization in College Structure before saving this officer."
              : form.department_id
                ? departmentLeaders
                  ? `Department student leaders: ${departmentLeaders.name}`
                  : "Create this department's Student Leaders organization in College Structure before saving this account."
                : "Select a department to connect this account to its department student leaders."}
          </p>
        </div>
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

function PositionInput({
  label,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="space-y-2">
      <FloatingInput label={label} value={value} onChange={onChange} />
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((position) => (
          <button
            type="button"
            key={position}
            onClick={() => onChange(position)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300 dark:hover:border-blue-700 dark:hover:text-blue-200"
          >
            {position}
          </button>
        ))}
      </div>
    </div>
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
  return roleName === "student" || isOfficerRole(roleName);
}

function isOfficerRole(roleName: string) {
  return roleName === "student_council" || roleName === "department_student_leader";
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

function isCreateFormValid(form: typeof emptyForm, organizations: Organization[] = []) {
  if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim() || form.password.length < 8) return false;
  if (needsStudentNumber(form.role) && !form.student_number.trim()) return false;
  if ((form.role === "student" || isOfficerRole(form.role)) && (!form.department_id || !form.course_id)) return false;
  if (form.role === "teacher" && !form.department_id) return false;
  if (isOfficerRole(form.role) && !form.officer_position.trim()) return false;
  if (form.role === "student_council" && !organizations.some((organization) => organization.organization_type === "student_council")) return false;
  if (form.role === "department_student_leader" && !organizations.some((organization) => organization.department_id === form.department_id && organization.organization_type === "department_student_leaders")) return false;
  return true;
}

function RoleAssignmentFields({
  roleOptions,
  selectedRoles,
  toggleRole,
  details,
  setDetails,
  departments,
  courses,
  sections,
  organizations,
}: {
  roleOptions: string[];
  selectedRoles: string[];
  toggleRole: (roleName: string) => void;
  details: typeof emptyRoleDetails;
  setDetails: Dispatch<SetStateAction<typeof emptyRoleDetails>>;
  departments: Department[];
  courses: Course[];
  sections: Section[];
  organizations: Organization[];
}) {
  const officerRole = selectedRoles.find(isOfficerRole);
  const showCouncilDetails = Boolean(officerRole);
  const filteredCourses = courses.filter((course) => !details.department_id || course.department_id === details.department_id);
  const filteredSections = sections.filter((section) => !details.course_id || section.course_id === details.course_id);
  const studentCouncil = organizations.find((organization) => organization.organization_type === "student_council");
  const departmentLeaders = organizations.find((organization) => organization.department_id === details.department_id && organization.organization_type === "department_student_leaders");
  const positionOptions = officerRole === "department_student_leader" ? DEPARTMENT_LEADER_POSITIONS : SC_POSITIONS;

  const setDepartment = (department_id: string) => {
    setDetails((current) => ({ ...current, department_id, course_id: "", section_id: "" }));
  };
  const setCourse = (course_id: string) => {
    setDetails((current) => ({ ...current, course_id, section_id: "" }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {roleOptions.map((item) => {
          const isStudentLocked = item === "student" && selectedRoles.some(isOfficerRole);
          return (
            <label key={item} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-navy-700">
              <input
                type="checkbox"
                checked={selectedRoles.includes(item)}
                disabled={isStudentLocked}
                onChange={() => toggleRole(item)}
              />
              {roleLabel(item)}
            </label>
          );
        })}
      </div>

      {showCouncilDetails && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div>
            <p className="text-sm font-semibold text-navy-900 dark:text-white">
              {officerRole === "student_council" ? "Student Council information" : "Department Student Leader information"}
            </p>
            <p className="mt-1 text-xs text-navy-500 dark:text-navy-300">
              Position, student ID, department, and course are required when assigning a council role.
            </p>
          </div>

          <PositionInput
            label="Position"
            value={details.officer_position}
            onChange={(value) => setDetails((current) => ({ ...current, officer_position: value }))}
            suggestions={positionOptions}
          />

          <FloatingInput
            label="Student ID number"
            value={details.student_number}
            onChange={(value) => setDetails((current) => ({ ...current, student_number: value }))}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={details.department_id} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.code} - {department.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={details.course_id} onValueChange={setCourse} disabled={!details.department_id}>
              <SelectTrigger><SelectValue placeholder={!details.department_id ? "Select department first" : "Course"} /></SelectTrigger>
              <SelectContent>
                {filteredCourses.map((course) => <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Select value={details.section_id} onValueChange={(value) => setDetails((current) => ({ ...current, section_id: value }))} disabled={!details.course_id}>
            <SelectTrigger><SelectValue placeholder={!details.course_id ? "Select course first" : "Section (optional)"} /></SelectTrigger>
            <SelectContent>
              {filteredSections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <p className={(officerRole === "student_council" ? studentCouncil : departmentLeaders) ? "text-xs text-emerald-600" : "text-xs text-amber-600"}>
            {officerRole === "student_council"
              ? studentCouncil
                ? `Council: ${studentCouncil.name}`
                : "Create the Student Council organization in College Structure before assigning this role."
              : details.department_id
                ? departmentLeaders
                  ? `Department student leaders: ${departmentLeaders.name}`
                  : "Create this department's Student Leaders organization in College Structure before assigning this role."
                : "Select a department to connect this member to the correct department student leaders."}
          </p>
        </div>
      )}
    </div>
  );
}

function canUpdateRoles(selectedRoles: string[], details: typeof emptyRoleDetails, organizations: Organization[] = []) {
  if (!selectedRoles.length) return false;
  const selectedOfficerRoles = selectedRoles.filter(isOfficerRole);
  if (selectedOfficerRoles.length > 1) return false;
  const officerRole = selectedOfficerRoles[0];
  if (!officerRole) return true;
  if (!details.officer_position.trim() || !details.student_number.trim() || !details.department_id || !details.course_id) return false;
  if (officerRole === "student_council") {
    return organizations.some((organization) => organization.organization_type === "student_council");
  }
  return organizations.some((organization) => organization.department_id === details.department_id && organization.organization_type === "department_student_leaders");
}

function roleAssignmentPayload(selectedRoles: string[], details: typeof emptyRoleDetails) {
  const roles = selectedRoles.some(isOfficerRole)
    ? Array.from(new Set([...selectedRoles, "student"]))
    : selectedRoles;
  const needsCouncilDetails = roles.some(isOfficerRole);
  return {
    roles,
    student_number: needsCouncilDetails ? details.student_number.trim() : undefined,
    department_id: needsCouncilDetails ? details.department_id || undefined : undefined,
    course_id: needsCouncilDetails ? details.course_id || undefined : undefined,
    section_id: needsCouncilDetails ? details.section_id || undefined : undefined,
    officer_position: needsCouncilDetails ? details.officer_position.trim() || undefined : undefined,
  };
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
