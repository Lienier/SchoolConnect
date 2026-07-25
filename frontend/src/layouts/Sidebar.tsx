import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Megaphone, 
  Settings,
  GraduationCap
} from "lucide-react";
import { cn } from "@/utils/cn";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Announcements", href: "/announcements", icon: Megaphone },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();

  return (
    <aside className={cn("flex flex-col border-r border-navy-200 bg-white dark:border-navy-800 dark:bg-navy-950 w-64 h-screen shadow-soft dark:shadow-none z-40 transition-all", className)}>
      <div className="flex h-16 items-center gap-2 px-6 border-b border-navy-200 dark:border-navy-800">
        <GraduationCap className="text-primary dark:text-navy-400" size={28} />
        <span className="text-xl font-bold text-navy-900 dark:text-white">SchoolConnect</span>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500 mb-4">
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-white shadow-md dark:bg-navy-800 dark:text-white" 
                  : "text-navy-600 hover:bg-navy-50 hover:text-navy-900 dark:text-navy-300 dark:hover:bg-navy-900 dark:hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "text-navy-400 dark:text-navy-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-navy-200 dark:border-navy-800">
        <div className="flex items-center gap-3 rounded-lg p-3 bg-navy-50 dark:bg-navy-900">
          <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-navy-800 flex items-center justify-center text-primary dark:text-white font-bold">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-navy-900 dark:text-white">Admin User</span>
            <span className="text-xs text-navy-500 dark:text-navy-400">System Administrator</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
