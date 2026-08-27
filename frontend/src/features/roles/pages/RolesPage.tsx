/** Roles management: list, create, edit, clone, and assign permissions. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Settings, Shield, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { rolesApi } from "@/features/roles/services/rolesApi";
import type { Permission, Role } from "@/features/roles/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";

type RoleFormValues = { name: string; display_name: string; description: string };
type ApiError = { response?: { data?: { message?: string } } };
const apiError = (error: unknown, fallback: string) => (error as ApiError)?.response?.data?.message ?? fallback;

export default function RolesPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ open: boolean; role: Role | null }>({ open: false, role: null });
  const [permissionEditor, setPermissionEditor] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [cloner, setCloner] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

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
  const roles = rolesQuery.data?.data ?? [];
  const meta = rolesQuery.data?.meta;
  const perms: Permission[] = permsQuery.data ?? [];

  const createMut = useMutation({
    mutationFn: (payload: RoleFormValues & { permissions: string[] }) => rolesApi.create(payload),
    onSuccess: (_data, variables) => {
      toast(`Role created: ${variables.display_name}.`, "success");
      setEditor({ open: false, role: null });
      invalidate();
    },
    onError: (e: unknown) => toast(apiError(e, "Failed to create role."), "error"),
  });

  const updateMut = useMutation({
    mutationFn: (payload: { id: string; display_name: string; description: string }) => rolesApi.update(payload.id, payload),
    onSuccess: (_data, variables) => {
      toast(`Role updated: ${variables.display_name}.`, "success");
      setEditor({ open: false, role: null });
      invalidate();
    },
    onError: (e: unknown) => toast(apiError(e, "Failed to update role."), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      toast(`Role deleted: ${deleteTarget?.display_name ?? "role"}.`, "success");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiError(e, "Failed to delete role."), "error"),
  });

  const cloneMut = useMutation({
    mutationFn: (payload: { id: string; name: string; display_name: string }) =>
      rolesApi.clone(payload.id, { name: payload.name, display_name: payload.display_name }),
    onSuccess: (_data, variables) => {
      toast(`Role cloned: ${variables.display_name}.`, "success");
      setCloner(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiError(e, "Failed to clone role."), "error"),
  });

  const assignMut = useMutation({
    mutationFn: (payload: { id: string; permissions: string[] }) => rolesApi.assignPermissions(payload.id, payload.permissions),
    onSuccess: () => {
      toast(`Role permissions updated: ${permissionEditor?.display_name ?? "role"}.`, "success");
      setPermissionEditor(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiError(e, "Failed to update permissions."), "error"),
  });

  const openPermissions = (role: Role) => {
    setPermissionEditor(role);
    setSelectedPermissions(role.permissions ?? []);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Create roles and manage permission assignments."
        actions={
          can("roles.create") && (
            <Button onClick={() => setEditor({ open: true, role: null })}>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          )
        }
      />

      <Card className="p-4">
        <Input
          placeholder="Search roles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
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
            {roles.map((role) => (
              <TR key={role.id}>
                <TD className="font-medium">{role.name}</TD>
                <TD>{role.display_name}</TD>
                <TD>{role.is_system ? <Badge tone="info">system</Badge> : <Badge>custom</Badge>}</TD>
                <TD><span className="text-navy-500">{(role.permissions ?? []).length} granted</span></TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    {can("roles.update") && !role.is_system && (
                      <Button size="sm" variant="secondary" onClick={() => setEditor({ open: true, role })}>
                        <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {can("roles.assign_permissions") && !role.is_system && (
                      <Button size="sm" variant="secondary" onClick={() => openPermissions(role)}>
                        <Shield className="mr-1.5 h-3.5 w-3.5" /> Permissions
                      </Button>
                    )}
                    {can("roles.create") && (
                      <Button size="sm" variant="ghost" onClick={() => setCloner(role)}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Clone
                      </Button>
                    )}
                    {can("roles.delete") && !role.is_system && (
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(role)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {roles.length === 0 && (
              <TR>
                <td colSpan={5} className="py-8 text-center text-navy-500">No roles found.</td>
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

      <ConfirmActionModal
        open={!!permissionEditor}
        title="Update role permissions"
        description="This will replace the permission set for this role. Users with this role may gain or lose access after their next refresh."
        itemName={permissionEditor?.display_name}
        confirmLabel="Update Permissions"
        isLoading={assignMut.isPending}
        onCancel={() => setPermissionEditor(null)}
        onConfirm={() => permissionEditor && assignMut.mutate({ id: permissionEditor.id, permissions: selectedPermissions })}
      >
        <PermissionsChecklist permissions={perms} selected={selectedPermissions} onChange={setSelectedPermissions} />
      </ConfirmActionModal>

      <Modal open={!!cloner} title={`Clone - ${cloner?.display_name ?? ""}`} onClose={() => setCloner(null)}>
        {cloner && (
          <CloneForm
            source={cloner}
            onSubmit={(payload) => cloneMut.mutate({ id: cloner.id, ...payload })}
            submitting={cloneMut.isPending}
          />
        )}
      </Modal>

      <ConfirmActionModal
        open={!!deleteTarget}
        title="Delete role"
        description="This will remove the custom role. System roles cannot be deleted."
        itemName={deleteTarget?.display_name}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function RoleForm({
  role,
  onSubmit,
  submitting,
}: {
  role: Role | null;
  onSubmit: (payload: RoleFormValues) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [displayName, setDisplayName] = useState(role?.display_name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!!role} placeholder="registrar" />
        {role && <p className="mt-1 text-xs text-navy-500 dark:text-navy-400">System name cannot be changed.</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">Description</label>
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

function PermissionsChecklist({
  permissions,
  selected,
  onChange,
}: {
  permissions: Permission[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    const key = permission.resource ?? "other";
    (acc[key] ??= []).push(permission);
    return acc;
  }, {});
  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter((permission) => permission !== name) : [...selected, name]);

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
      {Object.entries(grouped).map(([resource, list]) => (
        <div key={resource}>
          <p className="mb-1 text-xs font-semibold uppercase text-navy-500 dark:text-navy-400">{resource}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((permission) => (
              <label key={permission.name} className="inline-flex items-center gap-1.5 rounded-lg border border-navy-100 px-2.5 py-1 text-sm text-navy-700 dark:border-navy-800 dark:text-navy-200">
                <input type="checkbox" checked={selected.includes(permission.name)} onChange={() => toggle(permission.name)} />
                {permission.name}
              </label>
            ))}
          </div>
        </div>
      ))}
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
        <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">New Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">Display Name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit({ name, display_name: displayName })} isLoading={submitting}>Clone</Button>
      </div>
    </div>
  );
}
