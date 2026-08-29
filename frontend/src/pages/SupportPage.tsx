import { Link } from "react-router-dom";
import { Bell, CalendarDays, HelpCircle, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/AdminPrimitives";

const topics = [
  { title: "Account access", body: "Password resets, suspended accounts, role issues, and profile updates.", icon: ShieldCheck },
  { title: "Events and registration", body: "Event visibility, registration status, cancellations, and waitlist questions.", icon: CalendarDays },
  { title: "Notifications", body: "Unread alerts, registration updates, and event reminders.", icon: Bell },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help Center" subtitle="Get support for SchoolConnect workflows and account access." />
      <div className="grid gap-4 lg:grid-cols-3">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <Card key={topic.title} className="border-slate-200 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
              <Icon className="mb-4 text-blue-600 dark:text-blue-300" size={24} />
              <h2 className="font-semibold text-[#102858] dark:text-white">{topic.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-navy-300">{topic.body}</p>
            </Card>
          );
        })}
      </div>
      <Card className="border-slate-200 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-1 text-blue-600 dark:text-blue-300" size={22} />
            <div>
              <h2 className="font-semibold text-[#102858] dark:text-white">Need direct help?</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-navy-300">Contact your college administrator or IT support desk with your role, email, and the page where the issue happened.</p>
            </div>
          </div>
          <Link to="/notifications">
            <Button variant="secondary"><Mail className="mr-2 h-4 w-4" />Check notifications</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
