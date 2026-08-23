import { Link } from "react-router-dom";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { APP_NAME } from "@/constants";
import { BulletinFeed } from "@/features/announcements/components/BulletinFeed";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardPathForRoles } from "@/features/dashboards/routeForRole";

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const dashboardPath = dashboardPathForRoles(user?.roles);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,#eef4fb_0%,#f8fbfe_55%,#eef4fb_100%)] text-navy-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-sky-700 text-white shadow-lg shadow-sky-200/70">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
              <p className="text-xs text-navy-500">Bulletins, events, and updates in one living feed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/announcements">
              <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
                Explore feed
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link to={dashboardPath}>
                <Button size="sm">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-sm font-medium text-sky-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live bulletin stream for every user
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl lg:text-6xl">
                School updates should feel alive, familiar, and easy to scan.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-navy-600 sm:text-lg">
                {APP_NAME} now presents announcements and events like a modern social feed:
                urgent posts at the top, rich cards in the middle, and quick actions on every
                item for students, professors, student council, and admins.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/announcements">
                <Button size="lg" className="shadow-lg shadow-navy-900/10">
                  Open bulletin
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="secondary" size="lg">
                  Browse events
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-sky-200/70 via-white to-emerald-200/70 blur-2xl" />
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-navy-900/10 backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-navy-950 p-4 text-white">
                  <p className="text-xs uppercase tracking-wide text-white/60">Style</p>
                  <p className="mt-2 text-lg font-semibold">Social feed</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-sky-700">Audience</p>
                  <p className="mt-2 text-lg font-semibold text-navy-900">All users</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Actions</p>
                  <p className="mt-2 text-lg font-semibold text-navy-900">Share + register</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-navy-200 bg-navy-50 p-4 text-sm leading-6 text-navy-600">
                The bulletin stream below is the same design language used in role dashboards,
                with permission-aware actions layered on top instead of separate, disconnected
                page styles.
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10">
          <BulletinFeed
            title="Live bulletin feed"
            description="Urgent notices, pinned announcements, and upcoming events in a single social-style stream."
          />
        </div>
      </main>
    </div>
  );
}
