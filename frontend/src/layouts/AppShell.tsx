/**
 * AppShell — authenticated layout with a role-aware sidebar or topnav.
 *
 * Implements a hybrid navigation layout based on the user role.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/utils/cn";

export interface NavItem {
  label: string;
  to: string;
  perm?: string;
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

export function AppShell({ title, nav, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Student uses a top nav, everyone else uses sidebar
  const isStudent = title === "Student";

  useEffect(() => {
    if (isStudent) return; // No sidebar for student
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncSidebar = () => setIsSidebarOpen(mediaQuery.matches);
    syncSidebar();
    mediaQuery.addEventListener("change", syncSidebar);
    return () => mediaQuery.removeEventListener("change", syncSidebar);
  }, [isStudent]);

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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navLinks = visibleNav.flatMap(section => section.items);

  return (
    <div className="flex min-h-screen bg-navy-50 dark:bg-navy-950 text-navy-900 dark:text-navy-50 transition-colors">
      
      {/* Sidebar Overlay (Mobile) */}
      {!isStudent && isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-navy-900/40 dark:bg-navy-950/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (For Admin/Teacher/Officer) */}
      {!isStudent && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:transition-[width]",
            isSidebarOpen
              ? "translate-x-0 md:w-64"
              : "-translate-x-full md:w-0 md:overflow-hidden md:border-r-0",
          )}
        >
          <div className="border-b border-navy-100 dark:border-navy-800 px-5 py-4 flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-navy-800 dark:text-white">SchoolConnect</p>
              <p className="text-xs uppercase tracking-wide text-accent dark:text-navy-400">{title}</p>
            </div>
            <button className="md:hidden text-navy-500" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {visibleNav.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                        (isActive
                          ? "bg-primary text-white shadow-md dark:bg-navy-800"
                          : "text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800/50")
                      }
                      onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-100 dark:border-navy-800 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm px-4 md:px-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-4">
            {!isStudent && (
              <button 
                className="p-2 -ml-2 rounded-md text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                onClick={() => setIsSidebarOpen((v) => !v)}
              >
                <Menu size={20} />
              </button>
            )}
            
            {/* Student Top Navigation Links */}
            {isStudent && (
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-lg font-bold text-navy-800 dark:text-white">SchoolConnect</p>
                </div>
                <nav className="hidden md:flex items-center gap-2 ml-4">
                  {navLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
                        (isActive
                          ? "bg-primary text-white dark:bg-navy-800"
                          : "text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800")
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle />
            
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-navy-900 dark:text-white leading-tight">
                {user?.full_name}
              </p>
              <p className="text-xs text-navy-500 dark:text-navy-400 capitalize">
                {user?.roles?.[0]?.replace('_', ' ')}
              </p>
            </div>
            
            <div className="h-8 w-8 overflow-hidden rounded-full border border-navy-200 dark:border-navy-700 bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary dark:text-navy-300">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>

            <Button size="sm" variant="secondary" onClick={() => setIsLogoutConfirmOpen(true)} className="hidden sm:inline-flex dark:border-navy-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700">
              Log out
            </Button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <Modal
        open={isLogoutConfirmOpen}
        title="Log out"
        onClose={() => setIsLogoutConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await handleLogout();
                setIsLogoutConfirmOpen(false);
              }}
            >
              Log out
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-600 dark:text-navy-300">
          You will need to sign in again to continue using SchoolConnect.
        </p>
      </Modal>
    </div>
  );
}
