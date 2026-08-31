import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/utils/cn";

type Role = "admin" | "teacher" | "student_council" | "department_student_leader" | "student";

export function AppLayout() {
  // Mocking the user role for now. In a real app, this comes from an auth context.
  const [role] = useState<Role>("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change for mobile
  useEffect(() => {
    const timer = window.setTimeout(() => setSidebarOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const hasSidebar = role === "admin" || role === "teacher";

  return (
    <div className="flex h-screen w-full bg-navy-50 dark:bg-navy-950/50 overflow-hidden text-navy-900 dark:text-navy-100">
      
      {/* Mobile Sidebar Overlay */}
      {hasSidebar && sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-navy-900/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {hasSidebar && (
        <div className={cn(
          "fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <Sidebar />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopNav 
          showMenuButton={hasSidebar} 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
