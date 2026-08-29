/** College structure management: departments, courses, sections, orgs, years, semesters. */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { apiErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TD, TH, THead, TR, TBody } from "@/components/ui/Table";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { schoolApi } from "@/features/school/services/schoolApi";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import type { EntityKey } from "@/features/school/types";

type SchoolRecord = Record<string, unknown> & { id?: string };
type SchoolApiMethod = (first?: unknown, second?: unknown) => Promise<unknown>;
type DynamicSchoolApi = Record<string, SchoolApiMethod>;

const TABS: { key: EntityKey; label: string; managePerm: string }[] = [
  { key: "departments", label: "Departments", managePerm: "departments.manage" },
  { key: "courses", label: "Courses", managePerm: "courses.manage" },
  { key: "sections", label: "Sections", managePerm: "sections.manage" },
  { key: "organizations", label: "Organizations", managePerm: "organizations.manage" },
  { key: "academic_years", label: "Academic Years", managePerm: "academic_years.manage" },
  { key: "semesters", label: "Semesters", managePerm: "semesters.manage" },
];

export default function SchoolPage() {
  const [tab, setTab] = useState<EntityKey>("departments");
  const active = TABS.find((t) => t.key === tab)!;
  const { can } = usePermissions();
  const canManage = can(active.managePerm);

  return (
    <div className="space-y-6">
      <PageHeader title="College Structure" subtitle="Manage departments, courses, sections, organizations, academic years, and semesters." />
        <div className="mb-6 inline-flex flex-wrap rounded-xl border border-navy-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-lg px-4 py-1.5 text-sm font-medium " +
                (tab === t.key ? "bg-navy-800 text-white" : "text-navy-700")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <EntityTab key={tab} entity={tab} canManage={canManage} />
    </div>
  );
}

function EntityTab({ entity, canManage }: { entity: EntityKey; canManage: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; item: SchoolRecord | null }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<SchoolRecord | null>(null);

  const query = useQuery({
    queryKey: [entity, page, search],
    queryFn: () =>
      (schoolApi as unknown as DynamicSchoolApi)[`list${capitalize(entity)}`]({ page, search: search || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [entity] });

  const saveMut = useMutation({
    mutationFn: (payload: SchoolRecord) => {
      const api = schoolApi as unknown as DynamicSchoolApi;
      const name = capitalize(singular(entity));
      if (payload.id) return api[`update${name}`](payload.id, payload);
      return api[`create${name}`](payload);
    },
    onSuccess: () => {
      toast(`${singularLabel(entity)} saved.`, "success");
      setEditor({ open: false, item: null });
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Failed to save."), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      (schoolApi as unknown as DynamicSchoolApi)[`delete${capitalize(singular(entity))}`](id),
    onSuccess: () => {
      toast(`${singularLabel(entity)} deleted.`, "success");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Failed to delete."), "error"),
  });

  const result = query.data as { data?: SchoolRecord[]; meta?: { page: number; total_pages: number } } | undefined;
  const items = result?.data ?? [];
  const meta = result?.meta;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        {canManage && (
          <Button onClick={() => setEditor({ open: true, item: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>{columnsFor(entity).map((c) => <TH key={c}>{c}</TH>)}</TR>
        </THead>
        <TBody>
          {items.map((item) => (
            <TR key={item.id}>
              {cellsFor(entity, item).map((cell, i) => <TD key={i}>{cell}</TD>)}
              {canManage && (
                <TD>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditor({ open: true, item })}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </TD>
              )}
            </TR>
          ))}
          {items.length === 0 && (
            <TR>
              <td colSpan={columnsFor(entity).length + 1} className="text-center text-navy-500 py-8">
                No records found.
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

      <Modal open={editor.open} title={editor.item ? "Edit Record" : "New Record"} onClose={() => setEditor({ open: false, item: null })}>
        <EntityForm
          entity={entity}
          item={editor.item}
          onSubmit={(payload) => saveMut.mutate(payload)}
          submitting={saveMut.isPending}
        />
      </Modal>
      <ConfirmActionModal
        open={!!deleteTarget}
        title={`Delete ${singularLabel(entity).toLowerCase()}`}
        description="This will remove the record from the college structure. Related records may prevent deletion if the backend requires them."
        itemName={recordLabel(deleteTarget)}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?.id && deleteMut.mutate(deleteTarget.id)}
      />
    </Card>
  );
}

function singularLabel(entity: EntityKey) {
  return {
    departments: "Department",
    courses: "Course",
    sections: "Section",
    organizations: "Organization",
    academic_years: "Academic year",
    semesters: "Semester",
  }[entity];
}

function recordLabel(item: SchoolRecord | null) {
  if (!item) return null;
  return String(item.name ?? item.code ?? item.id ?? "Record");
}

function columnsFor(entity: EntityKey): string[] {
  switch (entity) {
    case "departments": return ["Code", "Name", "Description", ""];
    case "courses": return ["Code", "Name", "Department", ""];
    case "sections": return ["Name", "Course", "Semester", ""];
    case "organizations": return ["Name", "Category", ""];
    case "academic_years": return ["Name", "Range", "Current", ""];
    case "semesters": return ["Name", "Year", "Range", ""];
  }
}

function cellsFor(entity: EntityKey, item: SchoolRecord): ReactNode[] {
  switch (entity) {
    case "departments": return [item.code, item.name, item.description ?? "—"];
    case "courses": return [item.code, item.name, item.department_id];
    case "sections": return [item.name, item.course_id, item.semester_id];
    case "organizations": return [item.name, item.category ?? "—"];
    case "academic_years": return [item.name, `${item.start_date} – ${item.end_date}`, item.is_current ? <Badge tone="success">current</Badge> : "—"];
    case "semesters": return [item.name, item.academic_year_id, `${item.start_date} – ${item.end_date}`];
  }
}

function EntityForm({
  entity,
  item,
  onSubmit,
  submitting,
}: {
  entity: EntityKey;
  item: SchoolRecord | null;
  onSubmit: (payload: SchoolRecord) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<SchoolRecord>(item ?? {});
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const fields = useMemo(() => fieldConfig(entity), [entity]);

  return (
    <div className="space-y-4">
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.key} className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
            {f.label}
          </label>
        ) : (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-navy-700">{f.label}</label>
            <Input type={f.type === "date" ? "date" : "text"} value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ),
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit(form)} isLoading={submitting}>Save</Button>
      </div>
    </div>
  );
}

function fieldConfig(entity: EntityKey): { key: string; label: string; type: string }[] {
  switch (entity) {
    case "departments": return [{ key: "code", label: "Code", type: "text" }, { key: "name", label: "Name", type: "text" }, { key: "description", label: "Description", type: "text" }];
    case "courses": return [{ key: "department_id", label: "Department ID", type: "text" }, { key: "code", label: "Code", type: "text" }, { key: "name", label: "Name", type: "text" }];
    case "sections": return [{ key: "course_id", label: "Course ID", type: "text" }, { key: "semester_id", label: "Semester ID", type: "text" }, { key: "name", label: "Name", type: "text" }];
    case "organizations": return [{ key: "name", label: "Name", type: "text" }, { key: "category", label: "Category", type: "text" }, { key: "description", label: "Description", type: "text" }];
    case "academic_years": return [{ key: "name", label: "Name (e.g. 2025-2026)", type: "text" }, { key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }, { key: "is_current", label: "Set as current", type: "checkbox" }];
    case "semesters": return [{ key: "academic_year_id", label: "Academic Year ID", type: "text" }, { key: "name", label: "Name", type: "text" }, { key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }];
  }
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function singular(entity: EntityKey): string { return entity.endsWith("s") ? entity.slice(0, -1) : entity; }
