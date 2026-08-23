/** User management: list, search, filter, and lifecycle actions. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Lock, Plus, Shield, Trash2, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { usersApi } from "@/features/users/services/usersApi";
import type { UserListItem, UserStatus } from "@/features/users/types";

const SYSTEM_ROLES = ["admin", "teacher", "student_council", "student"];
const roleLabel = (role: string) => role === "teacher" ? "Professor" : role.replace("_", " ");
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  active: "success",
  invited: "info",
  inactive: "neutral",
  suspended: "danger",
};

const errorMessage = (error: unknown, fallback: string) => {
  const response = error as { response?: { data?: { message?: string } } };
  return response.response?.data?.message ?? fallback;
};

const emptyForm = { email: "", full_name: "", username: "", password: "", roles: ["student"], status: "active" as UserStatus };

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });
  const roleOptions = rolesQuery.data?.map((r) => r.name) ?? SYSTEM_ROLES;

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast("User created.", "success");
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: unknown) => toast(errorMessage(e, "User could not be created."), "error"),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; payload: { full_name?: string; username?: string | null; status?: UserStatus } }) => usersApi.update(args.id, args.payload),
    onSuccess: () => {
      toast("User updated.", "success");
      setEditTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(errorMessage(e, "User could not be updated."), "error"),
  });

  const rolesMut = useMutation({
    mutationFn: (args: { id: string; roles: string[] }) => usersApi.assignRoles(args.id, args.roles),
    onSuccess: () => {
      toast("Roles updated.", "success");
      setRolesTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(errorMessage(e, "Roles could not be updated."), "error"),
  });

  const lifecycle = useMutation({
    mutationFn: async (args: { id: string; action: "disable" | "reactivate" | "suspend" | "delete" }) => {
      if (args.action === "disable") await usersApi.disable(args.id);
      else if (args.action === "reactivate") await usersApi.reactivate(args.id);
      else if (args.action === "suspend") await usersApi.suspend(args.id);
      else await usersApi.delete(args.id);
    },
    onSuccess: () => {
      toast("User updated.", "success");
      invalidate();
    },
    onError: (e: unknown) => toast(errorMessage(e, "Action failed."), "error"),
  });

  const resetMut = useMutation({
    mutationFn: (args: { id: string; password: string }) => usersApi.resetPassword(args.id, args.password),
    onSuccess: () => {
      toast("Password reset.", "success");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: unknown) => toast(errorMessage(e, "Reset failed."), "error"),
  });

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setCreateOpen(true);
  };
  const openEdit = (user: UserListItem) => {
    setEditTarget(user);
    setForm({ email: user.email, full_name: user.full_name, username: user.username ?? "", password: "", roles: user.roles, status: user.status as UserStatus });
  };
  const openRoles = (user: UserListItem) => {
    setRolesTarget(user);
    setSelectedRoles(user.roles.length ? user.roles : ["student"]);
  };
  const toggleRole = (roleName: string) => {
    setSelectedRoles((current) => current.includes(roleName) ? current.filter((item) => item !== roleName) : [...current, roleName]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#102858]">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage accounts, roles, and access across the school community.</p>
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
                <TD>{u.email}</TD>
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

      <Modal open={createOpen} title="Create user" onClose={() => setCreateOpen(false)} footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button isLoading={createMut.isPending} disabled={!form.email || !form.full_name || form.password.length < 8 || !form.roles.length} onClick={() => createMut.mutate(form, { onSuccess: () => setCreateOpen(false) })}>Create</Button></>}>
        <UserForm form={form} setForm={setForm} roleOptions={roleOptions} includePassword />
      </Modal>

      <Modal open={!!editTarget} title={`Edit ${editTarget?.full_name ?? "user"}`} onClose={() => setEditTarget(null)} footer={<><Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button><Button isLoading={updateMut.isPending} onClick={() => editTarget && updateMut.mutate({ id: editTarget.id, payload: { full_name: form.full_name, username: form.username || null, status: form.status } })}>Save</Button></>}>
        <UserForm form={form} setForm={setForm} roleOptions={roleOptions} editMode />
      </Modal>

      <Modal open={!!rolesTarget} title={`Assign roles - ${rolesTarget?.full_name ?? ""}`} onClose={() => setRolesTarget(null)} footer={<><Button variant="secondary" onClick={() => setRolesTarget(null)}>Cancel</Button><Button isLoading={rolesMut.isPending} disabled={!selectedRoles.length} onClick={() => rolesTarget && rolesMut.mutate({ id: rolesTarget.id, roles: selectedRoles })}>Save roles</Button></>}>
        <div className="grid gap-2 sm:grid-cols-2">{roleOptions.map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selectedRoles.includes(item)} onChange={() => toggleRole(item)} />{roleLabel(item)}</label>)}</div>
      </Modal>

      <Modal open={!!resetTarget} title={`Reset password - ${resetTarget?.full_name ?? ""}`} onClose={() => setResetTarget(null)}>
        <div className="space-y-4"><Input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><div className="flex justify-end gap-2"><Button isLoading={resetMut.isPending} disabled={newPassword.length < 8} onClick={() => resetTarget && resetMut.mutate({ id: resetTarget.id, password: newPassword })}>Reset Password</Button></div></div>
      </Modal>

      <Modal open={!!confirmTarget} title="Confirm account action" onClose={() => setConfirmTarget(null)} footer={<><Button variant="secondary" onClick={() => setConfirmTarget(null)}>Cancel</Button><Button variant={confirmTarget?.action === "reactivate" ? "primary" : "danger"} isLoading={lifecycle.isPending} onClick={() => { if (confirmTarget) lifecycle.mutate({ id: confirmTarget.user.id, action: confirmTarget.action }, { onSettled: () => setConfirmTarget(null) }); }}>Confirm</Button></>}>
        <p className="text-sm text-slate-600">{confirmTarget ? `${confirmTarget.action.charAt(0).toUpperCase() + confirmTarget.action.slice(1)} ${confirmTarget.user.full_name}'s account?` : ""}</p>
      </Modal>
    </div>
  );
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
