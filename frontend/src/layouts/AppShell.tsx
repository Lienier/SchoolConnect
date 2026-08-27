/**
 * AppShell: authenticated layout using the administrator visual system.
 */
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Circle, GraduationCap, Menu, X } from "lucide-react";

import { ConfirmActionModal } from "@/components/ui/ConfirmActionModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/features/auth/context/AuthContext";
import { notificationsApi } from "@/features/notifications/services/notificationsApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/utils/cn";

export interface NavItem {
  label: string;
  to: string;
  perm?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppShellProps {
  title: string;
  nav: NavSection[];
  children: ReactNode;
}

function NotificationBell() {
  const navigate = useNavigate();
  const unread = useQuery({ queryKey: ["notifications-unread"], queryFn: notificationsApi.unreadCount });
  const count = unread.data ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate("/notifications")}
      className="relative rounded-lg p-2 text-navy-700 transition hover:bg-slate-100 dark:text-navy-200 dark:hover:bg-navy-800"
      aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
    >
      <Bell size={21} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function AppShell({ title, nav, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const isStudent = title === "Student";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncSidebar = () => setIsSidebarOpen(mediaQuery.matches);
    syncSidebar();
    mediaQuery.addEventListener("change", syncSidebar);
    return () => mediaQuery.removeEventListener("change", syncSidebar);
  }, []);

  const visibleNav = useMemo(
    () =>
      nav
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.perm || can(item.perm)),
        }))
        .filter((section) => section.items.length > 0),
    [nav, can],
  );

  const navEntries = useMemo(
    () =>
      visibleNav.flatMap((section, sectionIndex) =>
        section.items.map((item, itemIndex) => ({
          item,
          key: `${section.title}:${item.label}:${item.to}`,
          order: sectionIndex * 100 + itemIndex,
        })),
      ),
    [visibleNav],
  );
  const activeNavKey = useMemo(() => {
    const candidates = navEntries.filter(
      ({ item }) => location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(`${item.to}/`)),
    );

    candidates.sort((a, b) => b.item.to.length - a.item.to.length || a.order - b.order);
    return candidates[0]?.key ?? null;
  }, [location.pathname, navEntries]);

  const handleLogout = async () => {
    await logout();
    toast("Signed out.", "success");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-navy-900 dark:bg-navy-950 dark:text-navy-100">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-[#071e4d]/45 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[276px] flex-col overflow-hidden bg-navy-950 text-white shadow-2xl transition-transform dark:bg-[#08111f] md:sticky md:top-0 md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <GraduationCap size={27} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight">
              School<span className="text-sky-300">Connect</span>
            </p>
          </div>
          <button className="ml-auto md:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          {visibleNav.map((section) => (
            <div key={section.title}>
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-300/75">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon ?? Circle;
                  const navKey = `${section.title}:${item.label}:${item.to}`;
                  const isSelected = activeNavKey === navKey;
                  return (
                    <NavLink
                      key={navKey}
                      to={item.to}
                      onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                      className={() =>
                        cn(
                          "group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
                          isSelected
                            ? "bg-blue-700 text-white shadow-sm"
                            : "text-navy-200 hover:bg-white/10 hover:text-white",
                        )
                      }
                    >
                      <Icon size={19} className="shrink-0 opacity-90" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-semibold">
              {user?.full_name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.full_name ?? "User"}</p>
              <p className="truncate text-xs text-navy-300">{user?.email ?? ""}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur dark:border-navy-800 dark:bg-navy-950/95 dark:shadow-none md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-navy-300 dark:hover:bg-navy-800 md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            {isStudent && (
              <div className="flex min-w-0 items-center gap-3 md:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-navy-900/20 bg-navy-900 text-white shadow-sm dark:border-navy-700 dark:bg-navy-900">
                  <GraduationCap size={22} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-navy-900 dark:text-white">
                    School<span className="text-[#0d5ee8]">Connect</span>
                  </p>
                </div>
              </div>
            )}
            <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-navy-500 md:block">{title}</p>
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <NotificationBell />
            <ThemeToggle />
            {isStudent && (
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800 transition hover:bg-slate-100 dark:border-navy-700 dark:text-navy-200 dark:hover:bg-navy-800 sm:inline-flex"
              >
                Log out
              </button>
            )}
          </div>
        </header>

        {navEntries.length > 0 && (
          <div className="border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm dark:border-navy-800 dark:bg-navy-950/95 dark:shadow-none md:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {navEntries.slice(0, 6).map(({ item, key }) => {
                const Icon = item.icon ?? Circle;
                const isSelected = activeNavKey === key;
                return (
                  <NavLink
                    key={key}
                    to={item.to}
                    className={() =>
                      cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                        isSelected ? "bg-blue-700 text-white shadow-sm" : "bg-slate-50 text-navy-800 hover:bg-slate-100 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800",
                      )
                    }
                  >
                    <Icon size={15} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-7 lg:p-8">
          <div className="mx-auto max-w-[1480px]">{children}</div>
        </main>
      </div>

      <ConfirmActionModal
        open={isLogoutConfirmOpen}
        title="Log out"
        description="You will need to sign in again to continue using SchoolConnect."
        itemName={user?.email}
        confirmLabel="Log Out"
        confirmVariant="danger"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          await handleLogout();
          setIsLogoutConfirmOpen(false);
        }}
      />
    </div>
  );
}
