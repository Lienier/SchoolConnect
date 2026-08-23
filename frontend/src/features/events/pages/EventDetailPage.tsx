/** Event detail page: smart student registration plus staff controls. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Copy,
  Download,
  Edit3,
  MapPin,
  Shield,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/context/AuthContext";
import { eventsApi, registrationsApi } from "@/features/events/services/eventsApi";
import type { EventResult, SchoolEvent, TeamRegistration } from "@/features/events/types";
import { useToast } from "@/providers/ToastProvider";

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

function apiMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? fallback;
  }
  return fallback;
}

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "success",
  ongoing: "info",
  completed: "info",
  cancelled: "danger",
  archived: "neutral",
  returned: "warning",
};

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resultTitle, setResultTitle] = useState("");
  const [resultPlacement, setResultPlacement] = useState("");
  const [resultRemarks, setResultRemarks] = useState("");
  const [editingResult, setEditingResult] = useState<EventResult | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const isApprover = user?.roles?.some((r) => ["admin"].includes(r));
  const isManager = user?.roles?.some((r) => ["admin", "teacher", "student_council"].includes(r));
  const isStudent = Boolean(user?.roles?.includes("student"));

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id),
    enabled: Boolean(id),
  });
  const { data: roster } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: () => registrationsApi.listForEvent(id),
    enabled: Boolean(id) && Boolean(isManager),
  });
  const { data: results } = useQuery({
    queryKey: ["event-results", id],
    queryFn: () => eventsApi.listResults(id),
    enabled: Boolean(id) && ["completed", "ongoing"].includes(event?.status ?? ""),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["event", id] });
    queryClient.invalidateQueries({ queryKey: ["event-registrations", id] });
    queryClient.invalidateQueries({ queryKey: ["event-results", id] });
    queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const askConfirmation = (title: string, message: string, action: () => Promise<void>) => setPendingAction({ title, message, action });
  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction.action;
    setPendingAction(null);
    await action();
  };

  const handleDecideEvent = async (decision: "approved" | "rejected") => {
    try {
      await eventsApi.approve(id, decision);
      toast(`Event ${decision}.`, "success");
      refresh();
    } catch {
      toast("Could not update the event.", "error");
    }
  };

  const handleStatus = async (status: "ongoing" | "completed" | "cancelled" | "archived") => {
    try {
      await eventsApi.changeStatus(id, status);
      toast(`Event marked ${status}.`, "success");
      refresh();
    } catch {
      toast("Could not update event status.", "error");
    }
  };

  const handleAddResult = async () => {
    if (!resultTitle.trim()) return;
    try {
      await eventsApi.createResult(id, {
        title: resultTitle.trim(),
        placement: resultPlacement ? Number(resultPlacement) : null,
        winner_user_id: null,
        team_id: null,
        remarks: resultRemarks.trim() || null,
        attachment_file_id: null,
      });
      setResultTitle("");
      setResultPlacement("");
      setResultRemarks("");
      queryClient.invalidateQueries({ queryKey: ["event-results", id] });
      toast("Event result added.", "success");
    } catch {
      toast("Could not add event result.", "error");
    }
  };

  const handleUpdateResult = async () => {
    if (!editingResult || !resultTitle.trim()) return;
    try {
      await eventsApi.updateResult(editingResult.id, {
        title: resultTitle.trim(),
        placement: resultPlacement ? Number(resultPlacement) : null,
        remarks: resultRemarks.trim() || null,
      });
      setEditingResult(null);
      setResultTitle("");
      setResultPlacement("");
      setResultRemarks("");
      refresh();
      toast("Event result updated.", "success");
    } catch {
      toast("Could not update event result.", "error");
    }
  };

  const startEditResult = (result: EventResult) => {
    setEditingResult(result);
    setResultTitle(result.title);
    setResultPlacement(result.placement ? String(result.placement) : "");
    setResultRemarks(result.remarks ?? "");
  };

  const handleDeleteResult = async (resultId: string) => {
    try {
      await eventsApi.deleteResult(resultId);
      refresh();
      toast("Event result removed.", "success");
    } catch {
      toast("Could not remove event result.", "error");
    }
  };

  const handleDecideReg = async (regId: string, decision: "approved" | "rejected") => {
    try {
      await registrationsApi.decide(regId, decision);
      toast(`Registration ${decision}.`, "success");
      refresh();
    } catch {
      toast("Could not update registration.", "error");
    }
  };

  const exportRoster = () => {
    const rows = roster?.data ?? [];
    const csv = [
      ["participant", "event", "status", "team", "team_code", "registered_at"],
      ...rows.map((registration) => [
        registration.participant_name ?? "",
        registration.event_title ?? event.title,
        registration.status,
        registration.team_name ?? "",
        registration.team_code ?? "",
        registration.created_at,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    downloadCsv(`${event.title}-roster.csv`, csv);
  };

  if (isLoading || !event) {
    return <div className="mx-auto max-w-3xl py-8 text-center text-navy-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden p-0 dark:border-navy-800 dark:bg-navy-950">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-navy-900 dark:text-white">{event.title}</h1>
                {event.category && <Badge tone="neutral" className="text-xs">{event.category}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTones[event.status] ?? "neutral"} className="text-xs">{event.status.replace("_", " ")}</Badge>
                {event.is_team_event && <Badge tone="info" className="text-xs">Team event</Badge>}
                {event.approval_required && <Badge tone="warning" className="text-xs">Approval required</Badge>}
              </div>
            </div>
          </div>

          {event.description && <p className="mt-4 text-sm leading-6 text-navy-600 dark:text-navy-300">{event.description}</p>}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail icon={Calendar} label="Starts" value={formatDate(event.start_time)} />
            <Detail icon={Clock} label="Ends" value={formatDate(event.end_time)} />
            <Detail icon={MapPin} label="Location" value={event.location ?? "TBD"} />
            <Detail icon={Users} label="Capacity" value={event.capacity ? `${event.capacity} seats` : "Unlimited"} />
          </dl>
          {event.registration_deadline && (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Registration deadline: {formatDate(event.registration_deadline)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {isStudent && ["approved", "ongoing"].includes(event.status) && (
              <Button onClick={() => setRegistrationOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Register
              </Button>
            )}
            {isApprover && event.status === "pending_approval" && (
              <>
                <Button onClick={() => handleDecideEvent("approved")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => askConfirmation("Reject event", "Reject this event proposal?", () => handleDecideEvent("rejected"))}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            {isManager && ["approved", "ongoing"].includes(event.status) && (
              <Button variant="secondary" onClick={() => handleStatus(event.status === "approved" ? "ongoing" : "completed")}>
                {event.status === "approved" ? "Start event" : "Complete event"}
              </Button>
            )}
            {isManager && event.status === "completed" && (
              <Button variant="secondary" onClick={() => askConfirmation("Archive event", "Archive this completed event?", () => handleStatus("archived"))}>Archive event</Button>
            )}
            {isManager && ["approved", "ongoing"].includes(event.status) && (
              <Button variant="danger" onClick={() => askConfirmation("Cancel event", "Cancel this event for all participants?", () => handleStatus("cancelled"))}>Cancel event</Button>
            )}
          </div>
        </div>
      </Card>

      {isManager && (
        <Card className="p-6 dark:border-navy-800 dark:bg-navy-950">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-navy-800 dark:text-white">Registrations</h2>
            <Button size="sm" variant="secondary" disabled={!roster?.data?.length} onClick={exportRoster}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
          {(roster?.data ?? []).length === 0 ? (
            <p className="text-sm text-navy-500">No registrations yet.</p>
          ) : (
            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
              {roster?.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-navy-700 dark:text-navy-200">
                    {r.participant_name ?? `Participant ${r.user_id.slice(0, 8)}`}
                    <span className="ml-2 font-medium">{r.status}</span>
                    {r.team_name && <span className="ml-2 text-navy-400">Team: {r.team_name}</span>}
                  </span>
                  {r.status === "pending" && (
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => handleDecideReg(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => askConfirmation("Reject registration", "Reject this participant registration?", () => handleDecideReg(r.id, "rejected"))}>Reject</Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {["completed", "ongoing"].includes(event.status) && (
        <ResultsCard
          results={results ?? []}
          isManager={Boolean(isManager)}
          resultPlacement={resultPlacement}
          resultTitle={resultTitle}
          resultRemarks={resultRemarks}
          editingResult={editingResult}
          setResultPlacement={setResultPlacement}
          setResultTitle={setResultTitle}
          setResultRemarks={setResultRemarks}
          startEditResult={startEditResult}
          handleDeleteResult={(resultId) => askConfirmation("Delete result", "Remove this event result?", () => handleDeleteResult(resultId))}
          handleSave={editingResult ? handleUpdateResult : handleAddResult}
          clearEdit={() => {
            setEditingResult(null);
            setResultTitle("");
            setResultPlacement("");
            setResultRemarks("");
          }}
        />
      )}

      <RegistrationModal
        event={event}
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onSuccess={(message) => {
          toast(message, "success");
          setRegistrationOpen(false);
          refresh();
        }}
        onTeamCreated={(message) => {
          toast(message, "success");
          refresh();
        }}
        onError={(message) => toast(message, "error")}
      />
      <Modal
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? "Confirm action"}
        onClose={() => setPendingAction(null)}
        footer={<><Button variant="secondary" onClick={() => setPendingAction(null)}>Cancel</Button><Button variant="danger" onClick={confirmPendingAction}>Confirm</Button></>}
      >
        <p className="text-sm text-navy-600">{pendingAction?.message}</p>
      </Modal>
    </div>
  );
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, csv: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = filename.replace(/[^a-z0-9-_ .]/gi, "_");
  link.click();
  URL.revokeObjectURL(link.href);
}

function Detail({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-navy-400" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-navy-500">{label}</dt>
        <dd className="truncate text-sm text-navy-800 dark:text-navy-100">{value}</dd>
      </div>
    </div>
  );
}

function RegistrationModal({
  event,
  open,
  onClose,
  onSuccess,
  onTeamCreated,
  onError,
}: {
  event: SchoolEvent;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onTeamCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<"individual" | "create-team" | "join-team">("individual");
  const [notes, setNotes] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [createdTeam, setCreatedTeam] = useState<TeamRegistration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "create-team") {
        const team = await registrationsApi.registerTeam(event.id, teamName.trim());
        setCreatedTeam(team);
        onTeamCreated(`Team ${team.name} registered. Share code ${team.team_code}.`);
        return;
      }
      if (mode === "join-team") {
        const registration = await registrationsApi.joinTeam(teamCode.trim().toUpperCase());
        onSuccess(`Joined team registration ${registration.status}.`);
        return;
      }
      const registration = await registrationsApi.register(event.id, notes.trim() || undefined);
      onSuccess(`Registration ${registration.status}.`);
    } catch (error) {
      onError(apiMessage(error, "Could not complete registration."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!createdTeam?.team_code) return;
    await navigator.clipboard?.writeText(createdTeam.team_code);
  };

  return (
    <Modal open={open} title="Register for event" onClose={onClose} className="max-w-2xl">
      <div className="space-y-5">
        <Card className="border-navy-100 bg-navy-50 p-4 shadow-none dark:border-navy-800 dark:bg-navy-900">
          <h3 className="font-bold text-navy-900 dark:text-white">{event.title}</h3>
          <div className="mt-2 grid gap-2 text-sm text-navy-600 dark:text-navy-300 sm:grid-cols-2">
            <span>{event.start_time ? new Date(event.start_time).toLocaleString() : "Schedule TBD"}</span>
            <span>{event.capacity ? `${event.capacity} seats` : "Unlimited capacity"}</span>
            {event.registration_deadline && <span>Deadline {new Date(event.registration_deadline).toLocaleString()}</span>}
            {event.approval_required && <span>Approval required</span>}
          </div>
        </Card>

        {event.is_team_event && (
          <div className="grid gap-2 sm:grid-cols-3">
            <ModeButton active={mode === "individual"} onClick={() => setMode("individual")}>Solo</ModeButton>
            <ModeButton active={mode === "create-team"} onClick={() => setMode("create-team")}>Create team</ModeButton>
            <ModeButton active={mode === "join-team"} onClick={() => setMode("join-team")}>Join code</ModeButton>
          </div>
        )}

        {mode === "individual" && (
          <label className="block text-sm font-bold text-navy-800 dark:text-white">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for the organizer"
              className="mt-2 min-h-24 w-full rounded-2xl border border-navy-200 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
            />
          </label>
        )}

        {mode === "create-team" && (
          <div className="space-y-3">
            <label className="block text-sm font-bold text-navy-800 dark:text-white">
              Team name
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Example: STEM Titans"
                className="mt-2 h-11 w-full rounded-2xl border border-navy-200 px-3 text-sm font-normal outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
              />
            </label>
            {createdTeam && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="text-sm font-bold">Team created</p>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 font-mono text-lg font-black">
                  {createdTeam.team_code}
                  <Button size="sm" variant="secondary" onClick={copyCode}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "join-team" && (
          <label className="block text-sm font-bold text-navy-800 dark:text-white">
            Team code
            <input
              value={teamCode}
              onChange={(event) => setTeamCode(event.target.value.toUpperCase())}
              placeholder="SC-1234"
              className="mt-2 h-11 w-full rounded-2xl border border-navy-200 px-3 font-mono text-sm font-normal uppercase outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button
            isLoading={isSubmitting}
            disabled={
              isSubmitting ||
              (mode === "create-team" && !teamName.trim()) ||
              (mode === "join-team" && !teamCode.trim())
            }
            onClick={submit}
          >
            {mode === "create-team" ? "Create team" : mode === "join-team" ? "Join team" : "Confirm registration"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${active ? "border-sky-200 bg-sky-50 text-sky-700" : "border-navy-200 text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:text-navy-300"}`}
    >
      {children}
    </button>
  );
}

function ResultsCard({
  results,
  isManager,
  resultPlacement,
  resultTitle,
  resultRemarks,
  editingResult,
  setResultPlacement,
  setResultTitle,
  setResultRemarks,
  startEditResult,
  handleDeleteResult,
  handleSave,
  clearEdit,
}: {
  results: EventResult[];
  isManager: boolean;
  resultPlacement: string;
  resultTitle: string;
  resultRemarks: string;
  editingResult: EventResult | null;
  setResultPlacement: (value: string) => void;
  setResultTitle: (value: string) => void;
  setResultRemarks: (value: string) => void;
  startEditResult: (result: EventResult) => void;
  handleDeleteResult: (resultId: string) => void;
  handleSave: () => void;
  clearEdit: () => void;
}) {
  return (
    <Card className="border-slate-200 p-6 shadow-sm dark:border-navy-800 dark:bg-navy-950">
      <div className="flex items-center gap-2">
        <Trophy className="text-amber-500" size={20} />
        <h2 className="text-lg font-bold text-[#102858] dark:text-white">Event Results</h2>
      </div>
      {results.length ? (
        <div className="mt-4 space-y-3">
          {results.map((result) => (
            <div key={result.id} className="rounded-xl border border-slate-200 p-4 dark:border-navy-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-black text-amber-700">{result.placement ? `#${result.placement}` : "Award"}</span>
                  <strong className="text-[#102858] dark:text-white">{result.title}</strong>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEditResult(result)}><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteResult(result.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>
                  </div>
                )}
              </div>
              {result.remarks && <p className="mt-2 text-sm text-slate-600 dark:text-navy-300">{result.remarks}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Results have not been posted yet.</p>
      )}
      {isManager && (
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-[120px_1fr_1fr_auto_auto]">
          <input type="number" min="1" value={resultPlacement} onChange={(e) => setResultPlacement(e.target.value)} placeholder="Place" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input value={resultTitle} onChange={(e) => setResultTitle(e.target.value)} placeholder="Award or result title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input value={resultRemarks} onChange={(e) => setResultRemarks(e.target.value)} placeholder="Remarks" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <Button onClick={handleSave} disabled={!resultTitle.trim()}>{editingResult ? "Save result" : "Add result"}</Button>
          {editingResult && <Button variant="secondary" onClick={clearEdit}>Cancel</Button>}
        </div>
      )}
    </Card>
  );
}
