import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, LogIn, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { feedApi } from "@/features/announcements/services/feedApi";
import type { FeedItem } from "@/features/announcements/types/feed";
import { useAuth } from "@/features/auth/context/AuthContext";
import { dashboardPathForRoles } from "@/features/dashboards/routeForRole";

const heroImage =
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1800&q=80";

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const dashboardPath = dashboardPathForRoles(user?.roles);
  const [search, setSearch] = useState("");

  const feed = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => feedApi.list({ kind: "all", limit: 16 }),
  });

  const filteredItems = useMemo(() => {
    const items = feed.data?.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.body, item.category, item.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [feed.data?.data, search]);

  const announcements = filteredItems.filter((item) => item.type === "announcement").slice(0, 3);
  const events = filteredItems.filter((item) => item.type === "event").slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 text-[#102858] dark:bg-navy-950 dark:text-navy-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-navy-800 dark:bg-navy-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
              <BookOpen size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              School<span className="text-blue-700 dark:text-blue-300">Connect</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-navy-300 md:flex">
            <a href="#home" className="text-blue-700 dark:text-blue-300">Home</a>
            <a href="#announcements" className="transition hover:text-blue-700 dark:hover:text-blue-300">Announcements</a>
            <a href="#events" className="transition hover:text-blue-700 dark:hover:text-blue-300">Events</a>
            <a href="#features" className="transition hover:text-blue-700 dark:hover:text-blue-300">Features</a>
            <a href="#contact" className="transition hover:text-blue-700 dark:hover:text-blue-300">Contact</a>
          </nav>

          {isAuthenticated ? (
            <Link to={dashboardPath}>
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main>
        <section id="home" className="relative overflow-hidden bg-white dark:bg-navy-950">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/15 dark:from-navy-950 dark:via-navy-950/92 dark:to-navy-950/35" aria-hidden="true" />
          <div className="relative mx-auto flex min-h-[430px] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-5 inline-flex rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                Welcome to SchoolConnect
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#0c1f44] dark:text-white sm:text-5xl lg:text-6xl">
                Stay informed. Get involved. Be connected.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-navy-300 sm:text-lg">
                A focused platform for school announcements, upcoming events, registration,
                attendance, and community updates.
              </p>

              <form
                className="mt-7 flex max-w-xl flex-col gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/70 dark:border-navy-800 dark:bg-navy-950 dark:shadow-none sm:flex-row"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search announcements or events..."
                    className="h-12 w-full rounded-lg border-0 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:bg-navy-950 dark:text-navy-100 dark:placeholder:text-navy-500"
                  />
                </div>
                <Button type="submit" className="h-12 rounded-lg px-6">Search</Button>
              </form>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <FeatureCard title="Latest Announcements" text="Read official updates and notices from the school." to="#announcements" />
          <FeatureCard title="Upcoming Events" text="Browse activities, deadlines, venues, and schedules." to="#events" />
          <FeatureCard title="Easy Registration" text="Register for approved events with guided status updates." to="/events" />
          <FeatureCard title="Connected Community" text="Keep students, professors, officers, and admins aligned." to="/announcements" />
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[0.95fr_1.25fr] lg:px-8">
          <div id="announcements" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <SectionHeader title="Latest Announcements" to="/announcements" />
            <div className="mt-4 divide-y divide-slate-100">
              {feed.isLoading && <p className="py-8 text-sm text-slate-500">Loading announcements...</p>}
              {!feed.isLoading && announcements.length === 0 && (
                <p className="py-8 text-sm text-slate-500">No announcements found.</p>
              )}
              {announcements.map((item) => (
                <AnnouncementRow key={item.id} item={item} />
              ))}
            </div>
            <Link to="/announcements" className="mt-5 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
              View all announcements
              <ArrowRight size={15} className="ml-2" />
            </Link>
          </div>

          <div id="events" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:shadow-none">
            <SectionHeader title="Upcoming Events" to="/events" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {feed.isLoading && <p className="col-span-full py-8 text-sm text-slate-500">Loading events...</p>}
              {!feed.isLoading && events.length === 0 && (
                <p className="col-span-full py-8 text-sm text-slate-500">No upcoming events found.</p>
              )}
              {events.map((item, index) => (
                <EventCard key={item.id} item={item} index={index} />
              ))}
            </div>
            <Link to="/events" className="mt-5 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
              View all events
              <ArrowRight size={15} className="ml-2" />
            </Link>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#082554] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                <BookOpen size={21} />
              </div>
              <p className="text-lg font-bold">School<span className="text-blue-200">Connect</span></p>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/80">
              A centralized school bulletin and event registration platform for students,
              professors, student leaders, and administrators.
            </p>
          </div>
          <FooterLinks title="Quick Links" links={[["Home", "#home"], ["Announcements", "/announcements"], ["Events", "/events"], ["Login", "/login"]]} />
          <FooterLinks title="Support" links={[["Help Center", "/support"], ["Notifications", "/notifications"], ["Calendar", "/calendar"], ["My Registrations", "/registrations/mine"]]} />
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-blue-50/70">
          © 2026 SchoolConnect. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, text, to }: { title: string; text: string; to: string }) {
  return (
    <a href={to} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-950 dark:shadow-none dark:hover:border-blue-900 dark:hover:bg-navy-900">
      <p className="text-base font-semibold text-[#102858] dark:text-white">{title}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-navy-300">{text}</p>
      <span className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 dark:text-blue-300">
        Open
        <ArrowRight size={15} className="ml-2 transition group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold text-[#102858] dark:text-white">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
        View all
      </Link>
    </div>
  );
}

function AnnouncementRow({ item }: { item: FeedItem }) {
  return (
    <article className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
      <div>
        <p className="text-sm font-semibold text-[#102858] dark:text-white">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-navy-300">{item.body}</p>
      </div>
      <time className="text-xs font-medium text-slate-500 dark:text-navy-400">{formatDate(item.created_at)}</time>
    </article>
  );
}

function EventCard({ item, index }: { item: FeedItem; index: number }) {
  const eventImages = [
    "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=700&q=80",
  ];

  return (
    <Link to={`/events/${item.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 dark:border-navy-800 dark:bg-navy-950 dark:shadow-none dark:hover:border-blue-900">
      <div
        className="h-28 bg-cover bg-center"
        style={{ backgroundImage: `url(${eventImages[index % eventImages.length]})` }}
      />
      <div className="p-4">
        <div className="mb-3 inline-flex rounded-md bg-blue-700 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {formatDate(item.start_time ?? item.created_at, { month: "short", day: "2-digit" })}
        </div>
        <p className="line-clamp-2 min-h-10 text-sm font-semibold text-[#102858] dark:text-white">{item.title}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-navy-400">{formatTimeRange(item.start_time, item.end_time)}</p>
        <p className="mt-2 line-clamp-1 text-xs text-slate-500 dark:text-navy-400">{item.location ?? "Campus venue"}</p>
      </div>
    </Link>
  );
}

function FooterLinks({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-sm font-bold">{title}</p>
      <div className="mt-3 grid gap-2 text-sm text-blue-50/80">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="hover:text-white">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat("en", options ?? { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "Time to be announced";
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  return end ? `${time.format(new Date(start))} - ${time.format(new Date(end))}` : time.format(new Date(start));
}
