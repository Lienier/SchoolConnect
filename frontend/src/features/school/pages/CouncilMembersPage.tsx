/** Dedicated council membership management for Student Council and department leaders. */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Plus, Trash2, Users } from "lucide-react";

import { apiErrorMessage } from "@/api/errors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/AdminPrimitives";
import { schoolApi } from "@/features/school/services/schoolApi";
import type { CouncilMember, Department, Organization } from "@/features/school/types";
import { useToast } from "@/providers/ToastProvider";

const STUDENT_COUNCIL_POSITIONS = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];
const DEPARTMENT_LEADER_POSITIONS = ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "PIO", "Representative"];

type DraftMember = {
  user_id: string;
  full_name: string;
  email: string;
  position: string;
  student_number: string | null;
};

export default function CouncilMembersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCouncilId, setSelectedCouncilId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [setupDepartmentId, setSetupDepartmentId] = useState("");
  const [draftMembers, setDraftMembers] = useState<DraftMember[] | null>(null);

  const departments = useQuery({ queryKey: ["college-structure", "departments", "all"], queryFn: () => schoolApi.listDepartments({ page_size: 250 }) });
  const organizations = useQuery({ queryKey: ["college-structure", "organizations", "councils"], queryFn: () => schoolApi.listOrganizations({ page_size: 500 }) });
  const councils = useMemo(
    () => (organizations.data?.data ?? []).filter((org) => ["student_council", "department_student_leaders"].includes(org.organization_type)),
    [organizations.data?.data],
  );
  const selectedCouncil = councils.find((org) => org.id === selectedCouncilId) ?? councils[0];
  const activeCouncilId = selectedCouncil?.id ?? "";
  const members = useQuery({
    queryKey: ["college-structure", "council-members", activeCouncilId],
    queryFn: () => schoolApi.listCouncilMembers(activeCouncilId),
    enabled: Boolean(activeCouncilId),
  });
  const candidates = useQuery({
    queryKey: ["college-structure", "council-candidates", activeCouncilId],
    queryFn: () => schoolApi.listCouncilCandidates(activeCouncilId),
    enabled: Boolean(activeCouncilId),
  });
  const visibleMembers = draftMembers ?? (members.data ?? []).map(memberToDraft);
  const positions = selectedCouncil?.organization_type === "student_council" ? STUDENT_COUNCIL_POSITIONS : DEPARTMENT_LEADER_POSITIONS;
  const availableCandidates = (candidates.data ?? []).filter((candidate) => !visibleMembers.some((member) => member.user_id === candidate.user_id));
  const hasStudentCouncil = councils.some((org) => org.organization_type === "student_council");
  const departmentsWithoutLeaders = (departments.data?.data ?? []).filter(
    (department) => !councils.some((org) => org.organization_type === "department_student_leaders" && org.department_id === department.id),
  );

  const saveMembers = useMutation({
    mutationFn: () => schoolApi.updateCouncilMembers(activeCouncilId, visibleMembers.map(({ user_id, position }) => ({ user_id, position }))),
    onSuccess: (saved) => {
      toast("Council members updated.", "success");
      setDraftMembers(saved.map(memberToDraft));
      qc.invalidateQueries({ queryKey: ["college-structure", "council-members", activeCouncilId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast(apiErrorMessage(error, "Could not update council members."), "error"),
  });
  const createCouncil = useMutation({
    mutationFn: async (payload: { organization_type: Organization["organization_type"]; department_id?: string }) => {
      const department = departments.data?.data.find((item) => item.id === payload.department_id);
      const isStudentCouncil = payload.organization_type === "student_council";
      return schoolApi.createOrganization({
        organization_type: payload.organization_type,
        department_id: payload.department_id,
        name: isStudentCouncil ? "Student Council" : `${department?.code ?? "Department"} Student Leaders`,
        category: isStudentCouncil ? "Student Council" : "Department Student Leaders",
        description: isStudentCouncil
          ? "College-wide student council."
          : `Student leaders for ${department?.name ?? "the selected department"}.`,
      });
    },
    onSuccess: (created) => {
      toast("Council created.", "success");
      setSelectedCouncilId(created.id);
      setSetupDepartmentId("");
      setDraftMembers(null);
      qc.invalidateQueries({ queryKey: ["college-structure", "organizations"] });
      qc.invalidateQueries({ queryKey: ["college-structure", "organizations", "councils"] });
    },
    onError: (error) => toast(apiErrorMessage(error, "Could not create council."), "error"),
  });

  const selectCouncil = (org: Organization) => {
    setSelectedCouncilId(org.id);
    setDraftMembers(null);
    setSelectedUserId("");
    setSelectedPosition("");
  };

  const addMember = () => {
    const candidate = availableCandidates.find((item) => item.user_id === selectedUserId);
    if (!candidate || !selectedPosition) return;
    setDraftMembers([
      ...visibleMembers,
      {
        user_id: candidate.user_id,
        full_name: candidate.full_name,
        email: candidate.email,
        position: selectedPosition,
        student_number: candidate.student_number,
      },
    ]);
    setSelectedUserId("");
    setSelectedPosition("");
  };

  const removeMember = (userId: string) => {
    setDraftMembers(visibleMembers.filter((member) => member.user_id !== userId));
  };

  const updatePosition = (userId: string, position: string) => {
    setDraftMembers(visibleMembers.map((member) => member.user_id === userId ? { ...member, position } : member));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Council Members" subtitle="Change Student Council and Department Student Leader memberships without recreating accounts." />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Councils</h2>
          </div>
          <div className="space-y-2">
            {councils.map((org) => (
              <button
                type="button"
                key={org.id}
                onClick={() => selectCouncil(org)}
                className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${activeCouncilId === org.id ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100" : "border-slate-200 bg-white text-navy-700 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-950 dark:text-navy-200 dark:hover:bg-navy-900"}`}
              >
                <span className="block font-semibold">{org.name}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-navy-400">
                  {org.organization_type === "student_council" ? "Student Council" : departmentLabel(org, departments.data?.data ?? [])}
                </span>
              </button>
            ))}
            {!organizations.isLoading && councils.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                No councils have been created yet.
              </p>
            )}
          </div>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-navy-800">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-navy-400">Quick setup</p>
            <Button
              variant="secondary"
              className="w-full justify-start"
              disabled={hasStudentCouncil || createCouncil.isPending}
              isLoading={createCouncil.isPending}
              onClick={() => createCouncil.mutate({ organization_type: "student_council" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              {hasStudentCouncil ? "Student Council exists" : "Create Student Council"}
            </Button>
            <div className="space-y-2">
              <select
                value={setupDepartmentId}
                onChange={(event) => setSetupDepartmentId(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100"
                disabled={!departmentsWithoutLeaders.length}
              >
                <option value="">Select department</option>
                {departmentsWithoutLeaders.map((department) => (
                  <option key={department.id} value={department.id}>{department.code} - {department.name}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                className="w-full justify-start"
                disabled={!setupDepartmentId || createCouncil.isPending}
                isLoading={createCouncil.isPending}
                onClick={() => createCouncil.mutate({ organization_type: "department_student_leaders", department_id: setupDepartmentId })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Department Leaders
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          {selectedCouncil ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-navy-800 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-navy-900 dark:text-white">{selectedCouncil.name}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
                    {selectedCouncil.organization_type === "student_council"
                      ? "College-wide Student Council"
                      : departmentLabel(selectedCouncil, departments.data?.data ?? [])}
                  </p>
                </div>
                <Button isLoading={saveMembers.isPending} disabled={!activeCouncilId} onClick={() => saveMembers.mutate()}>
                  Save Members
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
                <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100">
                  <option value="">Select student</option>
                  {availableCandidates.map((candidate) => (
                    <option key={candidate.user_id} value={candidate.user_id}>
                      {candidate.full_name} {candidate.student_number ? `(${candidate.student_number})` : ""}
                    </option>
                  ))}
                </select>
                <select value={selectedPosition} onChange={(event) => setSelectedPosition(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100">
                  <option value="">Position</option>
                  {positions.map((position) => <option key={position} value={position}>{position}</option>)}
                </select>
                <Button variant="secondary" disabled={!selectedUserId || !selectedPosition} onClick={addMember}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-navy-800">
                <div className="grid grid-cols-[1fr_180px_80px] bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:bg-navy-900 dark:text-navy-400">
                  <span>Member</span>
                  <span>Position</span>
                  <span className="text-right">Action</span>
                </div>
                {visibleMembers.map((member) => (
                  <div key={member.user_id} className="grid grid-cols-[1fr_180px_80px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-navy-800">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-900 dark:text-white">{member.full_name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-navy-400">{member.student_number ?? member.email}</p>
                    </div>
                    <select value={member.position} onChange={(event) => updatePosition(member.user_id, event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-navy-800 dark:bg-navy-900">
                      {positions.map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                    <div className="text-right">
                      <Button size="sm" variant="danger" onClick={() => removeMember(member.user_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!members.isLoading && visibleMembers.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500 dark:text-navy-400">
                    <Users className="h-8 w-8" />
                    No members assigned.
                  </div>
                )}
              </div>

              <Badge tone="info">Saving replaces this council's member list.</Badge>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-navy-400">Select a council to manage members.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function memberToDraft(member: CouncilMember): DraftMember {
  return {
    user_id: member.user_id,
    full_name: member.full_name,
    email: member.email,
    position: member.position ?? "",
    student_number: member.student_number,
  };
}

function departmentLabel(org: Organization, departments: Department[]) {
  const department = departments.find((item) => item.id === org.department_id);
  return department ? `${department.code} - ${department.name}` : "Department Student Leaders";
}
