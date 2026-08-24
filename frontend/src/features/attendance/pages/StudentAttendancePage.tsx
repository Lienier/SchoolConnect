import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Keyboard, QrCode, XCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader, StatusBadge } from "@/components/ui/AdminPrimitives";
import { attendanceApi, type AttendanceRecord } from "@/features/attendance/services/attendanceApi";
import { useToast } from "@/providers/ToastProvider";

const tone = (status: string) => status === "present" ? "success" : status === "late" ? "warning" : status === "absent" ? "danger" : "info" as const;

export default function StudentAttendancePage() {
  const [token, setToken] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const records = useQuery({ queryKey: ["attendance-mine"], queryFn: () => attendanceApi.mine() });
  const checkIn = useMutation({
    mutationFn: (code: string) => attendanceApi.checkIn(code.trim()),
    onSuccess: (record) => {
      setToken("");
      setScannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["attendance-mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast(`Checked in for ${record.event_title ?? "the event"}.`, "success");
    },
    onError: () => toast("Check-in failed. Make sure you are registered, the code has not expired, and you are using your own account.", "error"),
  });

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;
    const elementId = "student-qr-reader";

    async function startScanner() {
      setScannerError(null);
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5QrcodeScanner(
          elementId,
          { fps: 10, qrbox: { width: 240, height: 240 } },
          false,
        );
        scannerRef.current = scanner;
        scanner.render(
          (decodedText) => {
            checkIn.mutate(decodedText);
            scanner.clear().catch(() => undefined);
          },
          () => undefined,
        );
      } catch {
        setScannerError("Camera scanning is unavailable. Enter the code manually instead.");
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [checkIn, scannerOpen]);

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" subtitle="Scan your professor's event QR or enter the code manually during an event." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#102858] dark:text-white">Event check-in</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-navy-300">
                Use the scanner when your professor shows the event QR code, or enter the check-in code below.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant={scannerOpen ? "secondary" : "primary"} onClick={() => setScannerOpen((value) => !value)}>
              {scannerOpen ? <XCircle className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
              {scannerOpen ? "Close scanner" : "Open scanner"}
            </Button>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-navy-800 dark:bg-navy-900">
              <Keyboard className="h-4 w-4 shrink-0 text-navy-400" />
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Enter check-in code"
                className="h-8 min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
              />
            </label>
            <Button disabled={!token.trim() || checkIn.isPending} onClick={() => checkIn.mutate(token)}>
              {checkIn.isPending ? "Checking in..." : "Check in"}
            </Button>
          </div>

          {scannerOpen && (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-navy-800 dark:bg-navy-900">
              <div id="student-qr-reader" className="min-h-72 bg-white dark:bg-navy-950" />
              {scannerError && <p className="mt-3 text-sm font-semibold text-red-600">{scannerError}</p>}
            </div>
          )}
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-[#102858] dark:text-white">Attendance summary</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Summary label="Records" value={records.data?.data.length ?? 0} />
            <Summary label="Present" value={(records.data?.data ?? []).filter((record) => record.status === "present").length} />
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-navy-400">Only your own attendance records are shown.</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#102858] dark:text-white">Attendance history</h2>
        {records.isLoading && <Card className="p-6 text-center text-sm text-navy-500">Loading attendance...</Card>}
        {records.isError && (
          <Card className="p-6 text-center text-sm text-red-600">
            Could not load your attendance. <button className="font-semibold underline" onClick={() => records.refetch()}>Try again</button>
          </Card>
        )}
        {!records.isLoading && !records.isError && !records.data?.data.length && (
          <Card className="border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:text-navy-400 dark:shadow-none">
            No attendance records yet.
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {(records.data?.data ?? []).map((record) => <AttendanceCard key={record.id} record={record} />)}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-navy-800 dark:bg-navy-900">
      <p className="text-2xl font-semibold text-[#102858] dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-navy-400">{label}</p>
    </div>
  );
}

function AttendanceCard({ record }: { record: AttendanceRecord }) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#102858] dark:text-white">{record.event_title ?? "Event"}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-navy-400">
            {record.check_in_at ? new Date(record.check_in_at).toLocaleString() : "No check-in time recorded"}
          </p>
        </div>
        <StatusBadge tone={tone(record.status)}>{record.status}</StatusBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-navy-500 dark:text-navy-300">
        <span className="rounded-lg bg-navy-50 px-3 py-1 font-semibold capitalize dark:bg-navy-900">{record.method}</span>
        {record.registration_status && <span className="rounded-lg bg-navy-50 px-3 py-1 font-semibold capitalize dark:bg-navy-900">{record.registration_status}</span>}
      </div>
    </Card>
  );
}
