/** Event detail page: smart student registration plus staff controls. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Copy,
  Download,
  Edit3,
  MapPin,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/api/client";
import { apiErrorMessage } from "@/api/errors";
import { API_BASE_URL } from "@/constants";
import { useAuth } from "@/features/auth/context/AuthContext";
import { eventsApi, registrationsApi } from "@/features/events/services/eventsApi";
import { usersApi } from "@/features/users/services/usersApi";
import type { EventResult, SchoolEvent } from "@/features/events/types";
import { useToast } from "@/providers/ToastProvider";

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

function normalizeTeamCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "")
    .replace(/^SC(?!-)(.+)/, "SC-$1");
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy path for mobile browsers.
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(input);
  return copied;
}

function resolveUploadUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api")) {
    const base = API_BASE_URL.endsWith("/api") ? API_BASE_URL.slice(0, -4) : "";
    return `${base}${url}`;
  }
  return url;
}

function apiPathFromUploadUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/api/")) return url.slice(4);
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/api/") ? parsed.pathname.slice(4) : null;
  } catch {
    return null;
  }
}

function useProtectedImage(url: string | null | undefined) {
  const resolvedUrl = resolveUploadUrl(url);
  const [objectUrl, setObjectUrl] = useState<{ path: string; url: string } | null>(null);
  const protectedPath = apiPathFromUploadUrl(resolvedUrl);

  useEffect(() => {
    if (!protectedPath) return undefined;

    let cancelled = false;
    let nextObjectUrl: string | null = null;
    apiClient
      .get(protectedPath, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        nextObjectUrl = URL.createObjectURL(response.data);
        setObjectUrl({ path: protectedPath, url: nextObjectUrl });
      })
      .catch(() => setObjectUrl(null));

    return () => {
      cancelled = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [protectedPath]);

  return protectedPath
    ? objectUrl?.path === protectedPath ? objectUrl.url : null
    : resolvedUrl;
}

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  approved: "success",
  ongoing: "info",
  completed: "info",
  cancelled: "danger",
  archived: "neutral",
};

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resultTitle, setResultTitle] = useState("");
  const [resultPlacement, setResultPlacement] = useState("");
  const [resultRemarks, setResultRemarks] = useState("");
  const [editingResult, setEditingResult] = useState<EventResult | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[] | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    message: string;
    itemName?: string | null;
    confirmLabel: string;
    variant?: "primary" | "danger" | "secondary";
    action: () => Promise<void>;
  } | null>(null);

  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const isStudent = Boolean(user?.roles?.includes("student"));

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id),
    enabled: Boolean(id),
  });
  const isManager = Boolean(event?.can_manage);
  const { data: roster } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: () => registrationsApi.listForEvent(id),
    enabled: Boolean(id) && Boolean(isManager),
  });
  const { data: results } = useQuery({
    queryKey: ["event-results", id],
    queryFn: () => eventsApi.listResults(id),
    enabled: Boolean(id) && isManager && ["completed", "ongoing"].includes(event?.status ?? ""),
  });
  const officers = useQuery({
    queryKey: ["event-officers", id],
    queryFn: () => eventsApi.listOfficers(id),
    enabled: Boolean(id) && isAdmin,
  });
  const officerUsers = useQuery({
    queryKey: ["users", "event-officers", "event-assignment"],
    queryFn: async () => {
      const [studentCouncil, departmentLeaders] = await Promise.all([
        usersApi.list({ role: "student_council", page_size: 250 }),
        usersApi.list({ role: "department_student_leader", page_size: 250 }),
      ]);
      const byId = new Map([...studentCouncil.data, ...departmentLeaders.data].map((officer) => [officer.id, officer]));
      return Array.from(byId.values());
    },
    enabled: isAdmin,
  });
  const detailImageUrl = useProtectedImage(event?.banner_url);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["event", id] });
    queryClient.invalidateQueries({ queryKey: ["event-registrations", id] });
    queryClient.invalidateQueries({ queryKey: ["event-results", id] });
    queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const askConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
    confirmLabel = "Confirm",
    variant: "primary" | "danger" | "secondary" = "primary",
    itemName: string | null = event?.title ?? null,
  ) => setPendingAction({ title, message, action, confirmLabel, variant, itemName });
  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction.action;
    setPendingAction(null);
    await action();
  };

  const handleStatus = async (status: "ongoing" | "completed" | "cancelled" | "archived") => {
    try {
      await eventsApi.changeStatus(id, status);
      toast(`Event marked ${status}.`, "success");
      refresh();
    } catch (error) {
      toast(apiErrorMessage(error, "Could not update event status."), "error");
    }
  };

  const saveOfficerAssignments = async () => {
    try {
      await eventsApi.assignOfficers(id, selectedOfficerIds ?? officers.data ?? []);
      toast("Event officers updated.", "success");
      setSelectedOfficerIds(null);
      queryClient.invalidateQueries({ queryKey: ["event-officers", id] });
    } catch (error) {
      toast(apiErrorMessage(error, "Could not update event officers."), "error");
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
    } catch (error) {
      toast(apiErrorMessage(error, "Could not add event result."), "error");
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
    } catch (error) {
      toast(apiErrorMessage(error, "Could not update event result."), "error");
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
    } catch (error) {
      toast(apiErrorMessage(error, "Could not remove event result."), "error");
    }
  };

  const handleDecideReg = async (regId: string, decision: "approved" | "rejected") => {
    try {
      await registrationsApi.decide(regId, decision);
      toast(`Registration ${decision}.`, "success");
      refresh();
    } catch (error) {
      toast(apiErrorMessage(error, "Could not update registration."), "error");
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
        {detailImageUrl && (
          <div
            className="h-64 border-b border-navy-100 bg-cover bg-center dark:border-navy-800"
            style={{ backgroundImage: `url(${detailImageUrl})` }}
            aria-label={`${event.title} photo`}
          />
        )}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-navy-900 dark:text-white">{event.title}</h1>
                {event.category && <Badge tone="neutral" className="text-xs">{event.category}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTones[event.status] ?? "neutral"} className="text-xs">{event.status.replace("_", " ")}</Badge>
                {event.is_team_event && <Badge tone="info" className="text-xs">Team event</Badge>}
                {event.approval_required && <Badge tone="warning" className="text-xs">Registration approval</Badge>}
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
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
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
            {isManager && ["approved", "ongoing"].includes(event.status) && (
              <Button variant="secondary" onClick={() => {
                const nextStatus = event.status === "approved" ? "ongoing" : "completed";
                askConfirmation(
                  nextStatus === "ongoing" ? "Start event" : "Complete event",
                  nextStatus === "ongoing" ? "This will mark the event as ongoing and keep attendance and registration views synchronized." : "This will mark the event as completed and move it out of active event workflows.",
                  () => handleStatus(nextStatus),
                  nextStatus === "ongoing" ? "Start Event" : "Complete Event",
                  "primary",
                );
              }}>
                {event.status === "approved" ? "Start event" : "Complete event"}
              </Button>
            )}
            {isManager && event.status === "completed" && (
              <Button variant="secondary" onClick={() => askConfirmation("Archive event", "This will archive the completed event and remove it from active event views.", () => handleStatus("archived"), "Archive", "secondary")}>Archive event</Button>
            )}
            {isManager && ["approved", "ongoing"].includes(event.status) && (
              <Button variant="danger" onClick={() => askConfirmation("Cancel event", "This will cancel the event for all participants and remove it from active registration workflows.", () => handleStatus("cancelled"), "Cancel Event", "danger")}>Cancel event</Button>
            )}
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-6 dark:border-navy-800 dark:bg-navy-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-800 dark:text-white">Officer Assignments</h2>
              <p className="mt-1 text-sm text-navy-500">Assigned Student Council officers and Department Student Leaders can manage this event's registrations, attendance, results, uploads, and reports.</p>
            </div>
            <Button size="sm" onClick={saveOfficerAssignments}>Save Assignments</Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(officerUsers.data ?? []).map((officer) => {
              const selected = selectedOfficerIds ?? officers.data ?? [];
              return (
                <label key={officer.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-navy-800">
                  <input
                    type="checkbox"
                    checked={selected.includes(officer.id)}
                    onChange={(change) => setSelectedOfficerIds(change.target.checked ? [...selected, officer.id] : selected.filter((id) => id !== officer.id))}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="min-w-0"><span className="block truncate font-semibold text-navy-800 dark:text-white">{officer.full_name}</span><span className="block truncate text-xs text-navy-500">{officer.username ?? officer.email}</span></span>
                </label>
              );
            })}
          </div>
          {!officerUsers.isLoading && !officerUsers.data?.length && <p className="mt-4 text-sm text-navy-500">No officer accounts are available.</p>}
        </Card>
      )}

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
                      <Button size="sm" onClick={() => askConfirmation("Approve registration", "This will approve the participant for this event and update the roster.", () => handleDecideReg(r.id, "approved"), "Approve", "primary", r.participant_name ?? "Participant")}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => askConfirmation("Reject registration", "This will reject the participant registration and remove it from active attendance workflows.", () => handleDecideReg(r.id, "rejected"), "Reject", "danger", r.participant_name ?? "Participant")}>Reject</Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {isManager && ["completed", "ongoing"].includes(event.status) && (
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
          handleDeleteResult={(resultId) => askConfirmation("Delete result", "This will remove the event result from the published event details.", () => handleDeleteResult(resultId), "Delete", "danger")}
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
        key={`${event.id}:${registrationOpen ? "open" : "closed"}`}
        event={event}
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        onCompleted={(message) => {
          toast(message, "success");
          refresh();
        }}
        onError={(message) => toast(message, "error")}
        onViewRegistrations={() => navigate("/registrations/mine")}
      />
      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.message ?? ""}
        itemName={pendingAction?.itemName}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        confirmVariant={pendingAction?.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
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
  onCompleted,
  onError,
  onViewRegistrations,
}: {
  event: SchoolEvent;
  open: boolean;
  onClose: () => void;
  onCompleted: (message: string) => void;
  onError: (message: string) => void;
  onViewRegistrations: () => void;
}) {
  const [mode, setMode] = useState<"individual" | "create-team" | "join-team">(
    event.is_team_event ? "create-team" : "individual",
  );
  const [notes, setNotes] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    status: "pending" | "approved" | "waitlisted";
    teamName?: string | null;
    teamCode?: string | null;
  } | null>(null);

  const selectMode = (nextMode: "individual" | "create-team" | "join-team") => {
    setMode(nextMode);
    setInlineError(null);
    setCopyStatus("idle");
  };

  const reportError = (message: string) => {
    setInlineError(message);
    onError(message);
  };

  const submit = async () => {
    if (isSubmitting) return;
    if (mode === "create-team" && !teamName.trim()) {
      reportError("Enter a team name before creating a team.");
      return;
    }
    if (mode === "join-team" && !normalizeTeamCode(teamCode)) {
      reportError("Enter a team code before joining.");
      return;
    }

    setInlineError(null);
    setIsSubmitting(true);
    try {
      if (mode === "create-team") {
        const team = await registrationsApi.registerTeam(event.id, teamName.trim());
        const status = team.registration_status ?? (event.approval_required ? "pending" : "approved");
        setReceipt({ status, teamName: team.name, teamCode: team.team_code });
        onCompleted(status === "waitlisted" ? "Team created. Your registration is waitlisted." : `Team created. Registration ${status}.`);
        return;
      }
      if (mode === "join-team") {
        const normalizedCode = normalizeTeamCode(teamCode);
        setTeamCode(normalizedCode);
        const registration = await registrationsApi.joinTeam(normalizedCode);
        setReceipt({
          status: registration.status as "pending" | "approved" | "waitlisted",
          teamName: registration.team_name,
          teamCode: registration.team_code ?? normalizedCode,
        });
        onCompleted(registration.status === "waitlisted" ? "Team joined. Your registration is waitlisted." : `Team joined. Registration ${registration.status}.`);
        return;
      }
      const registration = await registrationsApi.register(event.id, notes.trim() || undefined);
      setReceipt({ status: registration.status as "pending" | "approved" | "waitlisted" });
      onCompleted(registration.status === "waitlisted" ? "You were added to the event waitlist." : `Registration ${registration.status}.`);
    } catch (error) {
      reportError(apiErrorMessage(error, "Could not complete registration."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!receipt?.teamCode) return;
    const copied = await copyText(receipt.teamCode);
    setCopyStatus(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  };

  return (
    <Modal open={open} title="Register for event" onClose={onClose} className="max-w-2xl">
      <div className="space-y-5">
        <Card className="border-navy-100 bg-navy-50 p-4 shadow-none dark:border-navy-800 dark:bg-navy-900">
          <h3 className="font-semibold text-navy-900 dark:text-white">{event.title}</h3>
          <div className="mt-2 grid gap-2 text-sm text-navy-600 dark:text-navy-300 sm:grid-cols-2">
            <span>{event.start_time ? new Date(event.start_time).toLocaleString() : "Schedule TBD"}</span>
            <span>{event.capacity ? `${event.capacity} seats` : "Unlimited capacity"}</span>
            {event.registration_deadline && <span>Deadline {new Date(event.registration_deadline).toLocaleString()}</span>}
            {event.approval_required && <span>Registration approval required</span>}
          </div>
        </Card>

        {receipt ? (
          <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Registration recorded</p>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                {receipt.status === "waitlisted"
                  ? "The event is at capacity. Your place is saved on the waitlist."
                  : receipt.status === "pending"
                    ? "Your registration is waiting for organizer approval."
                    : "Your place in this event is confirmed."}
              </p>
            </div>
            <dl className="grid gap-3 rounded-lg border border-emerald-200 bg-white p-4 text-sm dark:border-emerald-900 dark:bg-navy-950 sm:grid-cols-2">
              <div>
                <dt className="text-navy-500 dark:text-navy-400">Event</dt>
                <dd className="mt-1 font-semibold text-navy-900 dark:text-white">{event.title}</dd>
              </div>
              <div>
                <dt className="text-navy-500 dark:text-navy-400">Status</dt>
                <dd className="mt-1 font-semibold capitalize text-navy-900 dark:text-white">{receipt.status}</dd>
              </div>
              {receipt.teamName && (
                <div>
                  <dt className="text-navy-500 dark:text-navy-400">Team</dt>
                  <dd className="mt-1 font-semibold text-navy-900 dark:text-white">{receipt.teamName}</dd>
                </div>
              )}
              {receipt.teamCode && (
                <div>
                  <dt className="text-navy-500 dark:text-navy-400">Team code</dt>
                  <dd className="mt-1 flex items-center gap-2 font-mono font-semibold text-navy-900 dark:text-white">
                    <span className="select-all">{receipt.teamCode}</span>
                    <Button size="sm" variant="secondary" onClick={copyCode} type="button">
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copyStatus === "copied" ? "Copied" : "Copy"}
                    </Button>
                  </dd>
                </div>
              )}
            </dl>
            {copyStatus === "failed" && (
              <p className="text-xs text-emerald-900 dark:text-emerald-100">Copy was blocked. Long-press the code and copy it manually.</p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose}>Done</Button>
              <Button onClick={onViewRegistrations}>View My Registrations</Button>
            </div>
          </div>
        ) : (
          <>

        {event.is_team_event && (
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeButton active={mode === "create-team"} onClick={() => selectMode("create-team")}>Create team</ModeButton>
            <ModeButton active={mode === "join-team"} onClick={() => selectMode("join-team")}>Join code</ModeButton>
          </div>
        )}

        {mode === "individual" && (
          <label className="block text-sm font-semibold text-navy-800 dark:text-white">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for the organizer"
              className="mt-2 min-h-24 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
            />
          </label>
        )}

        {mode === "create-team" && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-navy-800 dark:text-white">
              Team name
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Example: STEM Titans"
                className="mt-2 h-11 w-full rounded-lg border border-navy-200 px-3 text-sm font-normal outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
              />
            </label>
          </div>
        )}

        {mode === "join-team" && (
          <label className="block text-sm font-semibold text-navy-800 dark:text-white">
            Team code
            <input
              value={teamCode}
              onChange={(event) => setTeamCode(normalizeTeamCode(event.target.value))}
              placeholder="SC-1234"
              className="mt-2 h-11 w-full rounded-lg border border-navy-200 px-3 font-mono text-sm font-normal uppercase outline-none focus:border-sky-500 dark:border-navy-800 dark:bg-navy-950"
            />
          </label>
        )}

        {inlineError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {inlineError}
          </div>
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
          </>
        )}
      </div>
    </Modal>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${active ? "border-navy-800 bg-navy-900 text-white dark:border-blue-700 dark:bg-blue-700" : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50 dark:border-navy-800 dark:bg-navy-950 dark:text-navy-300 dark:hover:bg-navy-900"}`}
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
        <h2 className="text-lg font-semibold text-[#102858] dark:text-white">Event Results</h2>
      </div>
      {results.length ? (
        <div className="mt-4 space-y-3">
          {results.map((result) => (
            <div key={result.id} className="rounded-xl border border-slate-200 p-4 dark:border-navy-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{result.placement ? `#${result.placement}` : "Award"}</span>
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
