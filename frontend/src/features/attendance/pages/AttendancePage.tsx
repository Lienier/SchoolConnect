import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Copy, Download, QrCode, ScanLine, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { apiErrorMessage } from "@/api/errors";
import { Card } from "@/components/ui/Card";
import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, IconStat, PageHeader, StatusBadge } from "@/components/ui/AdminPrimitives";
import { eventsApi } from "@/features/events/services/eventsApi";
import { attendanceApi, type AttendanceRecord, type QrTokenResponse } from "@/features/attendance/services/attendanceApi";
import { useToast } from "@/providers/ToastProvider";
import { useAuth } from "@/features/auth/context/AuthContext";

const tone = (status: string) =>
  status === "present" ? "success" : status === "late" ? "warning" : status === "absent" ? "danger" : "info";

function ScannerModal({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (token: string) => void }) {
  const readerId = "attendance-qr-reader";
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let scanner: { render: (success: (text: string) => void, error?: () => void) => void; clear: () => Promise<void> } | null = null;
    let cancelled = false;

    import("html5-qrcode")
      .then(({ Html5QrcodeScanner }) => {
        if (cancelled) return;
        scanner = new Html5QrcodeScanner(readerId, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scanner.render((decodedText) => {
          onScan(decodedText);
          onClose();
        });
      })
      .catch(() => setError("Camera scanner could not be started on this browser."));

    return () => {
      cancelled = true;
      scanner?.clear().catch(() => undefined);
    };
  }, [open, onClose, onScan]);

  return (
    <Modal open={open} title="Scan attendance QR" onClose={onClose}>
      <div className="space-y-3">
        <div id={readerId} className="overflow-hidden rounded-xl border border-slate-200 dark:border-navy-800" />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

export default function AttendancePage() {
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [qrToken, setQrToken] = useState<QrTokenResponse | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    description: string;
    itemName?: string | null;
    confirmLabel: string;
    variant?: "primary" | "danger" | "secondary";
    onConfirm: () => void;
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isProfessor = Boolean(user?.roles?.includes("teacher"));

  const events = useQuery({
    queryKey: ["attendance-events", isProfessor ? user?.id : "all"],
    queryFn: async () => {
      const statuses = await Promise.all([
        eventsApi.list({ status: "approved", organizer_id: isProfessor ? user?.id : undefined }),
        eventsApi.list({ status: "ongoing", organizer_id: isProfessor ? user?.id : undefined }),
      ]);
      const byId = new Map(statuses.flatMap((result) => result.data).map((event) => [event.id, event]));
      return { data: Array.from(byId.values()) };
    },
    enabled: !isProfessor || Boolean(user?.id),
  });
  const availableEvents = events.data?.data ?? [];
  const selectedEventId = availableEvents.some((event) => event.id === eventId) ? eventId : availableEvents[0]?.id ?? "";
  const records = useQuery({ queryKey: ["attendance", selectedEventId], queryFn: () => attendanceApi.list(selectedEventId), enabled: Boolean(selectedEventId) });
  const summary = useQuery({ queryKey: ["attendance-summary", selectedEventId], queryFn: () => attendanceApi.summary(selectedEventId), enabled: Boolean(selectedEventId) });

  const refreshAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance", selectedEventId] });
    queryClient.invalidateQueries({ queryKey: ["attendance-summary", selectedEventId] });
  };

  const mark = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AttendanceRecord["status"] }) => attendanceApi.mark(selectedEventId, userId, status),
    onSuccess: (_record, variables) => {
      refreshAttendance();
      toast(`Attendance marked ${variables.status}.`, "success");
    },
    onError: (error) => toast(apiErrorMessage(error, "Attendance could not be updated."), "error"),
  });

  const qr = useMutation({
    mutationFn: () => attendanceApi.generateQr(selectedEventId),
    onSuccess: (data) => {
      setQrToken(data);
      navigator.clipboard?.writeText(data.token);
      toast(`QR generated for ${selectedEvent?.title ?? "the selected event"}.`, "success");
    },
    onError: (error) => toast(apiErrorMessage(error, "Could not generate a check-in code."), "error"),
  });

  const scan = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      refreshAttendance();
      queryClient.invalidateQueries({ queryKey: ["attendance-mine"] });
      toast("QR check-in recorded.", "success");
    },
    onError: (error) => toast(apiErrorMessage(error, "That QR code could not be used."), "error"),
  });

  const items = useMemo(
    () => (records.data?.data ?? []).filter((item) => `${item.participant_name ?? ""} ${item.status} ${item.registration_status ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [records.data?.data, search],
  );

  const selectedEvent = availableEvents.find((event) => event.id === selectedEventId);
  const confirmQr = (isRegenerate = false) =>
    setPendingAction({
      title: isRegenerate ? "Regenerate attendance QR" : "Generate attendance QR",
      description: isRegenerate
        ? "This will create a new event-wide check-in code. Students should use the latest code shown on screen."
        : "This will create an event-wide check-in code that students can scan from My Attendance until it expires.",
      itemName: selectedEvent?.title ?? "Selected event",
      confirmLabel: isRegenerate ? "Regenerate QR" : "Generate QR",
      onConfirm: () => qr.mutate(undefined, { onSettled: () => setPendingAction(null) }),
    });
  const confirmMarkAttendance = (item: AttendanceRecord, status: AttendanceRecord["status"]) =>
    setPendingAction({
      title: "Mark attendance",
      description: `This will mark the participant as ${status} for the selected event and update the attendance sheet.`,
      itemName: item.participant_name ?? "Participant",
      confirmLabel: `Mark ${status}`,
      variant: status === "absent" ? "danger" : "primary",
      onConfirm: () => mark.mutate({ userId: item.user_id, status }, { onSettled: () => setPendingAction(null) }),
    });
  const exportAttendance = () => {
    const csv = [
      ["participant", "registration_status", "attendance_status", "check_in_at", "method"],
      ...items.map((record) => [
        record.participant_name ?? "",
        record.registration_status ?? "",
        record.status,
        record.check_in_at ?? "",
        record.method,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    downloadCsv(`${selectedEvent?.title ?? "attendance"}-attendance.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isProfessor ? "Professor Attendance" : "Attendance"}
        subtitle={isProfessor ? "Generate event-wide QR codes and record attendance for your events." : "Record and monitor attendance for approved school events."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!selectedEventId || !items.length} onClick={exportAttendance}>
              <Download size={16} className="mr-2" />Export CSV
            </Button>
            <Button variant="secondary" disabled={!selectedEventId || qr.isPending} onClick={() => confirmQr(false)}>
              <QrCode size={16} className="mr-2" />{!selectedEventId ? "Select event first" : qr.isPending ? "Generating..." : "Generate QR"}
            </Button>
            <Button variant="primary" onClick={() => setScannerOpen(true)}>
              <ScanLine size={16} className="mr-2" />Scan QR
            </Button>
          </div>
        }
      />

      <Card className="border-slate-200 p-4 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="flex flex-col gap-3 md:flex-row">
          <select value={selectedEventId} onChange={(event) => { setEventId(event.target.value); setQrToken(null); }} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100 md:max-w-sm">
            <option value="">Select an event</option>
            {availableEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search participant or status..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm dark:border-navy-800 dark:bg-navy-900 dark:text-navy-100" />
          </div>
        </div>
        {events.isError && <p className="mt-3 text-sm text-red-600">Could not load events. <button className="font-semibold underline" onClick={() => events.refetch()}>Try again</button></p>}
        {!events.isLoading && !events.isError && !availableEvents.length && (
          <p className="mt-3 text-sm text-slate-500">
            No approved or ongoing {isProfessor ? "events owned by you" : "events"} are available for QR generation yet. Pending events need admin approval first.
          </p>
        )}
        {selectedEvent && (
          <p className="mt-3 text-sm text-slate-500 dark:text-navy-300">
            QR will be generated for <span className="font-semibold text-[#102858] dark:text-white">{selectedEvent.title}</span>. Students scan it from My Attendance.
          </p>
        )}
      </Card>

      {selectedEventId && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {["registered", "present", "late", "absent", "excused"].map((key) => (
              <IconStat key={key} label={key} value={summary.data?.[key] ?? 0} icon={key === "present" ? CheckCircle2 : ClipboardCheck} tone={tone(key)} />
            ))}
          </div>
          <Card className="overflow-hidden border-slate-200 p-0 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead><tr><th>Participant</th><th>Registration</th><th>Attendance</th><th>Check-in</th><th>Method</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold text-[#102858] dark:text-white">{item.participant_name ?? "Participant"}</td>
                      <td><StatusBadge tone="info">{item.registration_status ?? "approved"}</StatusBadge></td>
                      <td><StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge></td>
                      <td>{item.check_in_at ? new Date(item.check_in_at).toLocaleString() : "-"}</td>
                      <td className="capitalize">{item.method.replace("_", " ")}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {(["present", "late", "absent", "excused"] as const).map((status) => (
                            <Button key={status} size="sm" disabled={mark.isPending} variant={status === item.status ? "primary" : "secondary"} onClick={() => confirmMarkAttendance(item, status)}>{status}</Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.isLoading && <div className="p-6 text-center text-sm text-slate-500">Loading attendance...</div>}
            {records.isError && <div className="p-6 text-center text-sm text-red-600">Could not load attendance. <button className="font-semibold underline" onClick={() => records.refetch()}>Try again</button></div>}
            {!records.isLoading && !records.isError && !items.length && <EmptyState label="No approved participants found for this event." />}
          </Card>
        </>
      )}

      <Modal
        open={!!qrToken}
        title="Event check-in code"
        onClose={() => setQrToken(null)}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => qrToken && navigator.clipboard?.writeText(qrToken.token)}><Copy size={16} className="mr-2" />Copy code</Button>
            <Button disabled={!selectedEventId || qr.isPending} onClick={() => confirmQr(true)}><QrCode size={16} className="mr-2" />Regenerate</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-navy-300">Show this QR during the event. Students scan it from My Attendance to check themselves in.</p>
          {qrToken?.qr_data_url ? (
            <img alt="Attendance QR code" className="mx-auto h-56 w-56 rounded-xl border border-slate-200 bg-white p-2 dark:border-navy-800" src={qrToken.qr_data_url} />
          ) : (
            <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              QR image unavailable. Students can enter the code manually.
            </div>
          )}
          <code className="block break-all rounded-lg bg-slate-100 p-3 text-sm text-[#102858] dark:bg-navy-900 dark:text-navy-100">{qrToken?.token}</code>
          <p className="text-xs text-slate-500 dark:text-navy-400">Reusable for different students until {qrToken ? new Date(qrToken.expires_at).toLocaleString() : ""}</p>
        </div>
      </Modal>
      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={(token) => scan.mutate(token)} />
      <ConfirmActionModal
        open={!!pendingAction}
        title={pendingAction?.title ?? "Confirm action"}
        description={pendingAction?.description ?? ""}
        itemName={pendingAction?.itemName}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        confirmVariant={pendingAction?.variant}
        isLoading={mark.isPending || qr.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.onConfirm()}
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
