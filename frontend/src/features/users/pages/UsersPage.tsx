/** User management: list, search, filter, and lifecycle actions. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TD, TH, THead, TR, TBody } from "@/components/ui/Table";
import { Navbar } from "@/components/ui/Navbar";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { usersApi } from "@/features/users/services/usersApi";
import type { UserListItem, UserStatus } from "@/features/users/types";
import { Lock, UserX, UserCheck } from "lucide-react";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  active: "success",
  invited: "info",
  inactive: "neutral",
  suspended: "danger",
};

export default function UsersPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", page, search, status, role],
    queryFn: () =>
      usersApi.list({
        page,
        search: search || undefined,
        status: (status || undefined) as UserStatus | undefined,
        role: role || undefined,
      }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const lifecycle = useMutation({
    mutationFn: async (args: { id: string; action: "disable" | "reactivate" | "suspend" }) => {
      if (args.action === "disable") await usersApi.disable(args.id);
      else if (args.action === "reactivate") await usersApi.reactivate(args.id);
      else await usersApi.suspend(args.id);
    },
    onSuccess: () => {
      toast("User updated.", "success");
      invalidate();
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Action failed.", "error"),
  });

  const resetMut = useMutation({
    mutationFn: (args: { id: string; password: string }) =>
      usersApi.resetPassword(args.id, args.password),
    onSuccess: () => {
      toast("Password reset.", "success");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Reset failed.", "error"),
  });

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;

  return (
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title="Users"
        breadcrumbs={[{ label: "Users" }]}
        actions={
          <Input
            type="search"
            placeholder="Search name / email / username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
        }
      />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Card className="p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student_council">Student Council</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Roles</TH>
                <TH>Status</TH>
                <TH>Last Login</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.full_name}</TD>
                  <TD>{u.email}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} tone="info">{r}</Badge>
                      ))}
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[u.status] ?? "neutral"}>{u.status}</Badge>
                  </TD>
                  <TD className="text-navy-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      {can("users.update") && u.status === "active" && (
                        <Button size="sm" variant="secondary" onClick={() => lifecycle.mutate({ id: u.id, action: "disable" })}>
                          <UserX className="mr-1.5 h-3.5 w-3.5" /> Disable
                        </Button>
                      )}
                      {can("users.update") && u.status === "suspended" && (
                        <Button size="sm" variant="secondary" onClick={() => lifecycle.mutate({ id: u.id, action: "reactivate" })}>
                          <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                        </Button>
                      )}
                      {can("users.update") && u.status === "inactive" && (
                        <Button size="sm" variant="secondary" onClick={() => lifecycle.mutate({ id: u.id, action: "reactivate" })}>
                          <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                        </Button>
                      )}
                      {can("users.update") && (
                        <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)}>
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Reset PW
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
              {users.length === 0 && (
                <TR>
                  <td colSpan={6} className="text-center text-navy-500 py-8">
                    No users found.
                  </td>
                </TR>
              )}
            </TBody>
          </Table>

          {meta && (
            <div className="mt-4 flex items-center justify-between text-sm text-navy-600">
              <span>Page {meta.page} of {meta.total_pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>

        <Modal
          open={!!resetTarget}
          title={`Reset password — ${resetTarget?.full_name ?? ""}`}
          onClose={() => setResetTarget(null)}
        >
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                isLoading={resetMut.isPending}
                disabled={newPassword.length < 8}
                onClick={() => resetTarget && resetMut.mutate({ id: resetTarget.id, password: newPassword })}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}