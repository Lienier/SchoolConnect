/** College structure management: departments, courses, sections, orgs, years, semesters. */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Building2, CalendarDays, GitBranch, Plus, Settings, Trash2, Users } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type {
  AcademicYear,
  Course,
  Department,
  EntityKey,
  Organization,
  SchoolListResponse,
  Section,
  Semester,
} from "@/features/school/types";

type SchoolRecord = Record<string, unknown> & { id?: string };
type ListResult = { data: SchoolRecord[]; meta?: SchoolListResponse<SchoolRecord>["meta"] };
type RelationMaps = {
  departments: Department[];
  courses: Course[];
  sections: Section[];
  organizations: Organization[];
  academicYears: AcademicYear[];
  semesters: Semester[];
};

type OrganizationType = Organization["organization_type"];

const STUDENT_COUNCIL_POSITIONS = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];
const DEPARTMENT_LEADER_POSITIONS = ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];

const TABS: { key: EntityKey; label: string; managePerm: string }[] = [
  { key: "departments", label: "Departments", managePerm: "departments.manage" },
  { key: "courses", label: "Courses", managePerm: "courses.manage" },
  { key: "sections", label: "Sections", managePerm: "sections.manage" },
  { key: "organizations", label: "Organizations", managePerm: "organizations.manage" },
  { key: "academic_years", label: "Academic Years", managePerm: "academic_years.manage" },
  { key: "semesters", label: "Semesters", managePerm: "semesters.manage" },
];

const ENDPOINTS = {
  departments: {
    list: schoolApi.listDepartments,
    create: schoolApi.createDepartment,
    update: schoolApi.updateDepartment,
    delete: schoolApi.deleteDepartment,
  },
  courses: {
    list: schoolApi.listCourses,
    create: schoolApi.createCourse,
    update: schoolApi.updateCourse,
    delete: schoolApi.deleteCourse,
  },
  sections: {
    list: schoolApi.listSections,
    create: schoolApi.createSection,
    update: schoolApi.updateSection,
    delete: schoolApi.deleteSection,
  },
  organizations: {
    list: schoolApi.listOrganizations,
    create: schoolApi.createOrganization,
    update: schoolApi.updateOrganization,
    delete: schoolApi.deleteOrganization,
  },
  academic_years: {
    list: schoolApi.listAcademicYears,
    create: schoolApi.createAcademicYear,
    update: schoolApi.updateAcademicYear,
    delete: schoolApi.deleteAcademicYear,
  },
  semesters: {
    list: schoolApi.listSemesters,
    create: schoolApi.createSemester,
    update: schoolApi.updateSemester,
    delete: schoolApi.deleteSemester,
  },
};

export default function SchoolPage() {
  const [tab, setTab] = useState<EntityKey>("departments");
  const active = TABS.find((t) => t.key === tab)!;
  const { can } = usePermissions();
  const canManage = can(active.managePerm);

  const departmentsQuery = useQuery({ queryKey: ["college-structure", "departments", "all"], queryFn: () => schoolApi.listDepartments({ page_size: 250 }) });
  const coursesQuery = useQuery({ queryKey: ["college-structure", "courses", "all"], queryFn: () => schoolApi.listCourses({ page_size: 500 }) });
  const sectionsQuery = useQuery({ queryKey: ["college-structure", "sections", "all"], queryFn: () => schoolApi.listSections({ page_size: 500 }) });
  const organizationsQuery = useQuery({ queryKey: ["college-structure", "organizations", "all"], queryFn: () => schoolApi.listOrganizations({ page_size: 500 }) });
  const academicYearsQuery = useQuery({ queryKey: ["college-structure", "academic-years", "all"], queryFn: () => schoolApi.listAcademicYears({ page_size: 100 }) });
  const semestersQuery = useQuery({ queryKey: ["college-structure", "semesters", "all"], queryFn: () => schoolApi.listSemesters({ page_size: 250 }) });

  const relations = useMemo<RelationMaps>(() => ({
    departments: departmentsQuery.data?.data ?? [],
    courses: coursesQuery.data?.data ?? [],
    sections: sectionsQuery.data?.data ?? [],
    organizations: organizationsQuery.data?.data ?? [],
    academicYears: academicYearsQuery.data?.data ?? [],
    semesters: semestersQuery.data?.data ?? [],
  }), [academicYearsQuery.data?.data, coursesQuery.data?.data, departmentsQuery.data?.data, organizationsQuery.data?.data, sectionsQuery.data?.data, semestersQuery.data?.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="College Structure" subtitle="Build the college hierarchy used by accounts, registrations, reports, and event targeting." />
      <StructureGuide />
      <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 dark:border-navy-800 dark:bg-navy-950">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors " +
              (tab === t.key ? "bg-navy-800 text-white dark:bg-blue-600" : "text-navy-700 hover:bg-slate-100 dark:text-navy-200 dark:hover:bg-navy-900")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <EntityTab key={tab} entity={tab} canManage={canManage} relations={relations} />
    </div>
  );
}

function StructureGuide() {
  const steps = [
    { icon: Building2, label: "Department", detail: "Create the college unit first, for example CICS or CTE." },
    { icon: GitBranch, label: "Councils and Leaders", detail: "Create the college Student Council and each department's student leaders." },
    { icon: BookOpen, label: "Course", detail: "Attach each course or program to exactly one department." },
    { icon: CalendarDays, label: "Academic Year and Semester", detail: "Create the period where sections will exist." },
    { icon: Users, label: "Section", detail: "Attach the saved section to a course and semester." },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-950">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-navy-400">Step {index + 1}</span>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-navy-900 dark:text-white">{step.label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-navy-400">{step.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function EntityTab({ entity, canManage, relations }: { entity: EntityKey; canManage: boolean; relations: RelationMaps }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; item: SchoolRecord | null }>({ open: false, item: null });
  const [deleteTarget, setDeleteTarget] = useState<SchoolRecord | null>(null);

  const query = useQuery({
    queryKey: ["college-structure", entity, page, search],
    queryFn: () => ENDPOINTS[entity].list({ page, search: search || undefined }) as Promise<ListResult>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["college-structure", entity] });
    qc.invalidateQueries({ queryKey: ["college-structure"] });
  };

  const saveMut = useMutation({
    mutationFn: (payload: SchoolRecord) => {
      const endpoint = ENDPOINTS[entity];
      if (payload.id) return endpoint.update(payload.id, payload);
      return endpoint.create(payload);
    },
    onSuccess: () => {
      toast(`${singularLabel(entity)} saved.`, "success");
      setEditor({ open: false, item: null });
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Failed to save."), "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ENDPOINTS[entity].delete(id),
    onSuccess: () => {
      toast(`${singularLabel(entity)} deleted.`, "success");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: unknown) => toast(apiErrorMessage(e, "Failed to delete."), "error"),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{singularLabel(entity)} records</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{helperText(entity)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="sm:w-64"
          />
          {canManage && (
            <Button onClick={() => setEditor({ open: true, item: null })}>
              <Plus className="mr-2 h-4 w-4" />
              Add {singularLabel(entity)}
            </Button>
          )}
        </div>
      </div>

      <Table>
        <THead>
          <TR>{columnsFor(entity).map((c) => <TH key={c}>{c}</TH>)}</TR>
        </THead>
        <TBody>
          {items.map((item) => (
            <TR key={item.id}>
              {cellsFor(entity, item, relations).map((cell, i) => <TD key={i}>{cell}</TD>)}
              {canManage && (
                <TD>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditor({ open: true, item })}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </TD>
              )}
            </TR>
          ))}
          {items.length === 0 && (
            <TR>
              <td colSpan={columnsFor(entity).length + 1} className="py-8 text-center text-navy-500">
                No records found.
              </td>
            </TR>
          )}
        </TBody>
      </Table>

      {meta && (
        <div className="mt-4 flex items-center justify-between text-sm text-navy-600 dark:text-navy-300">
          <span>Page {meta.page} of {meta.total_pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={editor.open} title={editor.item ? `Edit ${singularLabel(entity)}` : `New ${singularLabel(entity)}`} onClose={() => setEditor({ open: false, item: null })}>
        <EntityForm
          entity={entity}
          item={editor.item}
          relations={relations}
          onSubmit={(payload) => saveMut.mutate(payload)}
          submitting={saveMut.isPending}
        />
      </Modal>
      <ConfirmActionModal
        open={!!deleteTarget}
        title={`Delete ${singularLabel(entity).toLowerCase()}`}
        description="This will remove the record from the college structure. Related records may prevent deletion if they still depend on it."
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

function EntityForm({
  entity,
  item,
  relations,
  onSubmit,
  submitting,
}: {
  entity: EntityKey;
  item: SchoolRecord | null;
  relations: RelationMaps;
  onSubmit: (payload: SchoolRecord) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<SchoolRecord>(item ?? {});
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const canSave = formIsValid(entity, form);
  const submitPayload = () => {
    if (entity !== "organizations") return form;
    return { ...form, positions: cleanPositions(form.positions) };
  };

  return (
    <div className="space-y-4">
      <RelationshipHint entity={entity} form={form} relations={relations} />
      {fieldsFor(entity, form, set, relations)}
      <div className="flex justify-end gap-2">
        <Button onClick={() => onSubmit(submitPayload())} isLoading={submitting} disabled={!canSave}>Save</Button>
      </div>
    </div>
  );
}

function RelationshipHint({ entity, form, relations }: { entity: EntityKey; form: SchoolRecord; relations: RelationMaps }) {
  if (!["courses", "sections", "organizations", "semesters"].includes(entity)) return null;
  const department = findById(relations.departments, String(form.department_id ?? ""));
  const course = findById(relations.courses, String(form.course_id ?? ""));
  const semester = findById(relations.semesters, String(form.semester_id ?? ""));
  const academicYear = findById(relations.academicYears, String(form.academic_year_id ?? ""));
  const orgType = String(form.organization_type ?? "college_wide") as OrganizationType;
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {entity === "courses" && <>This course will be connected under {department ? <strong>{labelDepartment(department)}</strong> : "the selected department"}.</>}
          {entity === "sections" && <>This section will be connected under {course ? <strong>{labelCourse(course, relations)}</strong> : "the selected course"} and {semester ? <strong>{labelSemester(semester, relations)}</strong> : "the selected semester"}.</>}
          {entity === "organizations" && ["college_wide", "student_council"].includes(orgType) && <>This {organizationTypeLabel(orgType).toLowerCase()} is college-wide and is not tied to one department.</>}
          {entity === "organizations" && !["college_wide", "student_council"].includes(orgType) && <>This {organizationTypeLabel(orgType).toLowerCase()} will be connected under {department ? <strong>{labelDepartment(department)}</strong> : "the selected department"}.</>}
          {entity === "semesters" && <>This semester will be connected under {academicYear ? <strong>{academicYear.name}</strong> : "the selected academic year"}.</>}
        </span>
      </div>
    </div>
  );
}

function fieldsFor(entity: EntityKey, form: SchoolRecord, set: (key: string, value: unknown) => void, relations: RelationMaps) {
  const textField = (key: string, label: string, type = "text") => (
    <div key={key}>
      <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">{label}</label>
      <Input type={type} value={String(form[key] ?? "")} onChange={(e) => set(key, e.target.value)} />
    </div>
  );
  const selectField = (key: string, label: string, placeholder: string, options: { value: string; label: string }[], disabled = false) => (
    <div key={key}>
      <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">{label}</label>
      <Select value={String(form[key] ?? "")} onValueChange={(value) => set(key, value)} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
  const setOrganizationType = (value: string) => {
    set("organization_type", value);
    if (["college_wide", "student_council"].includes(value)) set("department_id", "");
    if (["student_council", "department_student_leaders"].includes(value) && !Array.isArray(form.positions)) {
      set("positions", defaultPositionsFor(value as OrganizationType));
    }
    if (!["student_council", "department_student_leaders"].includes(value)) {
      set("positions", []);
    }
  };

  switch (entity) {
    case "departments":
      return [textField("code", "Code"), textField("name", "Name"), textField("description", "Description")];
    case "courses":
      return [
        selectField("department_id", "Department", "Select department", relations.departments.map((department) => ({ value: department.id, label: labelDepartment(department) }))),
        textField("code", "Code"),
        textField("name", "Name"),
      ];
    case "sections":
      return [
        selectField("course_id", "Course", "Select course", relations.courses.map((course) => ({ value: course.id, label: labelCourse(course, relations) }))),
        selectField("semester_id", "Semester", "Select semester", relations.semesters.map((semester) => ({ value: semester.id, label: labelSemester(semester, relations) }))),
        textField("name", "Section name"),
      ];
    case "organizations":
      return [
        (
          <div key="organization_type">
            <label className="mb-1 block text-sm font-medium text-navy-700 dark:text-navy-200">Organization type</label>
            <Select value={String(form.organization_type ?? "college_wide")} onValueChange={setOrganizationType}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college_wide">College-wide organization</SelectItem>
                <SelectItem value="student_council">Student Council</SelectItem>
                <SelectItem value="department_organization">Department organization</SelectItem>
                <SelectItem value="department_student_leaders">Department Student Leaders</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
        selectField(
          "department_id",
          "Department",
          "Select department",
          relations.departments.map((department) => ({ value: department.id, label: labelDepartment(department) })),
          ["college_wide", "student_council"].includes(String(form.organization_type ?? "college_wide")),
        ),
        textField("name", "Name"),
        textField("category", "Category"),
        textField("description", "Description"),
        ["student_council", "department_student_leaders"].includes(String(form.organization_type ?? "college_wide")) && (
          <OrganizationPositionsEditor
            key="positions"
            positions={Array.isArray(form.positions) ? form.positions.map(String) : defaultPositionsFor(String(form.organization_type ?? "college_wide") as OrganizationType)}
            setPositions={(positions) => set("positions", positions)}
            suggestions={defaultPositionsFor(String(form.organization_type ?? "college_wide") as OrganizationType)}
          />
        ),
      ];
    case "academic_years":
      return [
        textField("name", "Name, for example 2026-2027"),
        textField("start_date", "Start date", "date"),
        textField("end_date", "End date", "date"),
        <label key="is_current" className="flex items-center gap-2 text-sm text-navy-700 dark:text-navy-200">
          <input type="checkbox" checked={!!form.is_current} onChange={(e) => set("is_current", e.target.checked)} />
          Set as current academic year
        </label>,
      ];
    case "semesters":
      return [
        selectField("academic_year_id", "Academic year", "Select academic year", relations.academicYears.map((year) => ({ value: year.id, label: year.name }))),
        textField("name", "Name"),
        textField("start_date", "Start date", "date"),
        textField("end_date", "End date", "date"),
      ];
  }
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

function helperText(entity: EntityKey) {
  return {
    departments: "Top-level academic units. Courses belong to departments.",
    courses: "Programs or courses offered by a department. Choose the department before saving.",
    sections: "Student groups under a course and semester. Choose the course and semester before saving.",
    organizations: "College-wide groups, department organizations, and department councils.",
    academic_years: "The college year used to organize semesters.",
    semesters: "Terms inside an academic year. Sections are connected to semesters.",
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
    case "organizations": return ["Name", "Type", "Department", "Roles / Positions", "Category", ""];
    case "academic_years": return ["Name", "Range", "Current", ""];
    case "semesters": return ["Name", "Academic Year", "Range", ""];
  }
}

function cellsFor(entity: EntityKey, item: SchoolRecord, relations: RelationMaps): ReactNode[] {
  switch (entity) {
    case "departments": return [item.code, item.name, item.description ?? "-"];
    case "courses": return [item.code, item.name, labelDepartment(findById(relations.departments, String(item.department_id ?? "")))];
    case "sections": return [item.name, labelCourse(findById(relations.courses, String(item.course_id ?? "")), relations), labelSemester(findById(relations.semesters, String(item.semester_id ?? "")), relations)];
    case "organizations": return [
      item.name,
      organizationTypeLabel(String(item.organization_type ?? "college_wide") as OrganizationType),
      ["college_wide", "student_council"].includes(String(item.organization_type ?? "college_wide")) ? "College-wide" : labelDepartment(findById(relations.departments, String(item.department_id ?? ""))),
      cleanPositions(item.positions).length ? cleanPositions(item.positions).join(", ") : "-",
      item.category ?? "-",
    ];
    case "academic_years": return [item.name, `${item.start_date} - ${item.end_date}`, item.is_current ? <Badge tone="success">current</Badge> : "-"];
    case "semesters": return [item.name, findById(relations.academicYears, String(item.academic_year_id ?? ""))?.name ?? "Unknown academic year", `${item.start_date} - ${item.end_date}`];
  }
}

function formIsValid(entity: EntityKey, form: SchoolRecord) {
  switch (entity) {
    case "departments": return !!form.code && !!form.name;
    case "courses": return !!form.department_id && !!form.code && !!form.name;
    case "sections": return !!form.course_id && !!form.semester_id && !!form.name;
    case "organizations":
      return !!form.name
        && (["college_wide", "student_council"].includes(String(form.organization_type ?? "college_wide")) || !!form.department_id)
        && (!["student_council", "department_student_leaders"].includes(String(form.organization_type ?? "college_wide")) || cleanPositions(form.positions).length > 0);
    case "academic_years": return !!form.name && !!form.start_date && !!form.end_date;
    case "semesters": return !!form.academic_year_id && !!form.name && !!form.start_date && !!form.end_date;
  }
}

function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function labelDepartment(department?: Department) {
  if (!department) return "Unknown department";
  return `${department.code} - ${department.name}`;
}

function labelCourse(course: Course | undefined, relations: RelationMaps) {
  if (!course) return "Unknown course";
  const department = findById(relations.departments, course.department_id);
  return `${course.code} - ${course.name}${department ? ` (${department.code})` : ""}`;
}

function labelSemester(semester: Semester | undefined, relations: RelationMaps) {
  if (!semester) return "Unknown semester";
  const academicYear = findById(relations.academicYears, semester.academic_year_id);
  return `${semester.name}${academicYear ? `, ${academicYear.name}` : ""}`;
}

function organizationTypeLabel(type: OrganizationType) {
  return {
    college_wide: "College-wide Organization",
    student_council: "Student Council",
    department_organization: "Department Organization",
    department_student_leaders: "Department Student Leaders",
  }[type];
}

function OrganizationPositionsEditor({
  positions,
  setPositions,
  suggestions,
}: {
  positions: string[];
  setPositions: (positions: string[]) => void;
  suggestions: string[];
}) {
  const visiblePositions = positions.length ? positions : [""];
  const update = (index: number, value: string) => {
    const next = [...visiblePositions];
    next[index] = value;
    setPositions(next);
  };
  const add = (value = "") => {
    setPositions([...cleanPositions(visiblePositions), value]);
  };
  const remove = (index: number) => {
    const next = visiblePositions.filter((_, itemIndex) => itemIndex !== index);
    setPositions(next.length ? next : [""]);
  };

  return (
    <div key="positions" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-navy-800 dark:bg-navy-900/60">
      <div>
        <label className="block text-sm font-medium text-navy-700 dark:text-navy-200">Council roles / positions</label>
        <p className="mt-1 text-xs text-slate-500 dark:text-navy-400">Create the positions here first, then assign students to these positions in Council Members.</p>
      </div>
      <div className="space-y-2">
        {visiblePositions.map((position, index) => (
          <div key={index} className="flex gap-2">
            <Input value={position} placeholder="Position name" onChange={(event) => update(index, event.target.value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.filter((position) => !cleanPositions(visiblePositions).includes(position)).map((position) => (
          <button
            type="button"
            key={position}
            onClick={() => add(position)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-navy-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-navy-700 dark:bg-navy-950 dark:text-navy-300"
          >
            + {position}
          </button>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => add()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add position
        </Button>
      </div>
    </div>
  );
}

function cleanPositions(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((position) => String(position).trim())
    .filter((position) => {
      if (!position || seen.has(position.toLowerCase())) return false;
      seen.add(position.toLowerCase());
      return true;
    });
}

function defaultPositionsFor(type: OrganizationType) {
  if (type === "student_council") return STUDENT_COUNCIL_POSITIONS;
  if (type === "department_student_leaders") return DEPARTMENT_LEADER_POSITIONS;
  return [];
}
