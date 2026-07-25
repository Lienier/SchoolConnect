/** Roles management: list, create, edit, clone, and assign permissions. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TD, TH, THead, TR, TBody } from "@/components/ui/Table";
import { Navbar } from "@/components/ui/Navbar";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { rolesApi } from "@/features/roles/services/rolesApi";
import type { Permission, Role } from "@/features/roles/types";
import { Plus, Shield, Copy, Settings, Trash2 } from "lucide-react";

const EMPTY_FORM = { name: "", display_name: "", description: "" };

export default function RolesPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editor, setEditor] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [permissionEditor, setPermissionEditor] = useState<Role | null>(null);
  const [cloner, setCloner] = useState<Role | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles", page, search],
    queryFn: () => rolesApi.list({ page, search: search || undefined }),
  });
  const permsQuery = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: () => rolesApi.listPermissions(),
    enabled: !!permissionEditor,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["roles"] });

  const createMut = useMutation({
    mutationFn: (payload: typeof EMPTY_FORM & { permissions: string[] }) =>
      rolesApi.create(payload),
    onSuccess: () => {
      toast("Role created.", "success");
      setEditor({ open: false, role: null });
      invalidate();
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Failed to create role.", "error"),
  });

  const updateMut = useMutation({
    mutationFn: (payload: { id: string; display_name: string; description: string }) =>
      rolesApi.update(payload.id, payload),
    onSuccess: () => {
      toast("Role updated.", "success");
      setEditor({ open: false, role: null });
      invalidate();
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Failed to update role.", "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      toast("Role deleted.", "success");
      invalidate();
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Failed to delete role.", "error"),
  });

  const cloneMut = useMutation({
    mutationFn: (payload: { id: string; name: string; display_name: string }) =>
      rolesApi.clone(payload.id, {
        name: payload.name,
        display_name: payload.display_name,
      }),
    onSuccess: () => {
      toast("Role cloned.", "success");
      setCloner(null);
      invalidate();
    },
    onError: (e: any) => toast(e?.response?.data?.message ?? "Failed to clone role.", "error"),
  });

  const assignMut = useMutation({
    mutationFn: (payload: { id: string; permissions: string[] }) =>
      rolesApi.assignPermissions(payload.id, payload.permissions),
    onSuccess: () => {
      toast("Permissions updated.", "success");
      setPermissionEditor(null);
      invalidate();
    },
    onError: (e: any) =>
      toast(e?.response?.data?.message ?? "Failed to update permissions.", "error"),
  });

  const roles = rolesQuery.data?.data ?? [];
  const meta = rolesQuery.data?.meta;
  const perms: Permission[] = permsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-navy-50">
      <Navbar
        title="Roles & Permissions"
        breadcrumbs={[{ label: "Roles" }]}
        actions={
          can("roles.create") && (
            <Button onClick={() => setEditor({ open: true, role: null })}>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          )
        }
      />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Card className="p-4">
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="mb-4 max-w-sm"
          />
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Display Name</TH>
                <TH>System</TH>
                <TH>Permissions</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {roles.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD>{r.display_name}</TD>
                  <TD>{r.is_system ? <Badge tone="info">system</Badge> : <Badge>custom</Badge>}</TD>
                  <TD>
                    <span className="text-navy-500">{(r.permissions ?? []).length} granted</span>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      {can("roles.update") && !r.is_system && (
                        <Button size="sm" variant="secondary" onClick={() => setEditor({ open: true, role: r })}>
                          <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                      {can("roles.assign_permissions") && !r.is_system && (
                        <Button size="sm" variant="secondary" onClick={() => setPermissionEditor(r)}>
                          <Shield className="mr-1.5 h-3.5 w-3.5" /> Permissions
                        </Button>
                      )}
                      {can("roles.create") && (
                        <Button size="sm" variant="ghost" onClick={() => setCloner(r)}>
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Clone
                        </Button>
                      )}
                      {can("roles.delete") && !r.is_system && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => { if (confirm(`Delete role "${r.display_name}"?`)) deleteMut.mutate(r.id); }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
              {roles.length === 0 && (
                <TR>
                  <td colSpan={5} className="text-center text-navy-500 py-8">No roles found.</td>
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

        {/* Create / Edit modal */}
        <Modal open={editor.open} title={editor.role ? "Edit Role" : "New Role"} onClose={() => setEditor({ open: false, role: null })}>
          <RoleForm
            role={editor.role}
            onSubmit={(payload) => {
              if (editor.role) updateMut.mutate({ id: editor.role.id, display_name: payload.display_name, description: payload.description });
              else createMut.mutate({ ...payload, permissions: [] });
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Modal>

        {/* Permissions modal */}
        <Modal open={!!permissionEditor} title={`Permissions — ${permissionEditor?.display_name ?? ""}`} onClose={() => setPermissionEditor(null)} className="max-w-2xl">
          {permissionEditor && (
            <PermissionsEditor
              permissions={perms}
              selected={permissionEditor.permissions ?? []}
              onSubmit={(selected) => assignMut.mutate({ id: permissionEditor.id, permissions: selected })}
              submitting={assignMut.isPending}
            />
          )}
        </Modal>

        {/* Clone modal */}
        <Modal open={!!cloner} title={`Clone — ${cloner?.display_name ?? ""}`} onClose={() => setCloner(null)}>
          {cloner && (
            <CloneForm
              source={cloner}
              onSubmit={(payload) => cloneMut.mutate({ id: cloner.id, ...payload })}
              submitting={cloneMut.isPending}
            />
          )}
        </Modal>
      </main>
    </div>
  );
}

function RoleForm({
  role,
  onSubmit,
  submitting,
}: {
  role: Role | null;
  onSubmit: (payload: { name: string; display_name: string; description: string }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [displayName, setDisplayName] = useState(role?.display_name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!!role} placeholder="registrar" />
        {role && <p className="mt-1 text-xs text-navy-500">System name cannot be changed.</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit({ name, display_name: displayName, description })} isLoading={submitting} disabled={!displayName.trim()}>
          {role ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function PermissionsEditor({
  permissions,
  selected,
  onSubmit,
  submitting,
}: {
  permissions: Permission[];
  selected: string[];
  onSubmit: (selected: string[]) => void;
  submitting: boolean;
}) {
  const [checked, setChecked] = useState<string[]>(selected);
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const key = p.resource ?? "other";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const toggle = (name: string) =>
    setChecked((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {Object.entries(grouped).map(([resource, list]) => (
          <div key={resource}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">{resource}</p>
            <div className="flex flex-wrap gap-2">
              {list.map((p) => (
                <label key={p.name} className="inline-flex items-center gap-1.5 rounded-lg border border-navy-100 px-2.5 py-1 text-sm">
                  <input type="checkbox" checked={checked.includes(p.name)} onChange={() => toggle(p.name)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit(checked)} isLoading={submitting}>Save Permissions</Button>
      </div>
    </div>
  );
}

function CloneForm({
  source,
  onSubmit,
  submitting,
}: {
  source: Role;
  onSubmit: (payload: { name: string; display_name: string }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(`${source.name}_copy`);
  const [displayName, setDisplayName] = useState(`${source.display_name} (Copy)`);
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700">New Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit({ name, display_name: displayName })} isLoading={submitting}>Clone</Button>
      </div>
    </div>
  );
}