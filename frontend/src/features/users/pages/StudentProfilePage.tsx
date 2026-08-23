/** Read-only student profile surface. */
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { PageHeader, StatusBadge } from "@/components/ui/AdminPrimitives";
import { usersApi } from "@/features/users/services/usersApi";

export default function StudentProfilePage() {
  const profile = useQuery({
    queryKey: ["users", "me", "profile"],
    queryFn: usersApi.getMyProfile,
  });
  const user = profile.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Your school account details are shown here for reference."
      />

      {profile.isLoading && <Card className="border-slate-200 p-6 text-sm text-slate-500 shadow-sm">Loading profile...</Card>}
      {profile.isError && (
        <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Could not load your profile right now.
        </Card>
      )}

      {user && (
        <>
          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <UserRound className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-black text-[#102858]">
                  {user.full_name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <StatusBadge key={role} tone="info">{role.replace("_", " ")}</StatusBadge>
                  ))}
                  <StatusBadge tone={user.status === "active" ? "success" : "warning"}>{user.status}</StatusBadge>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <ProfileField icon={Mail} label="Email" value={user.email} />
            <ProfileField icon={Phone} label="Phone" value={user.phone ?? "Not provided"} />
            <ProfileField icon={UserRound} label="Username" value={user.username ?? "Not provided"} />
            <ProfileField icon={ShieldCheck} label="Email Verified" value={user.email_verified ? "Verified" : "Not verified"} />
          </div>

          <Card className="border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Profile changes are handled by school staff for this MVP.
          </Card>
        </>
      )}
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#102858]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="mt-1 block truncate text-sm font-semibold text-[#102858]">{value}</span>
      </span>
    </Card>
  );
}
