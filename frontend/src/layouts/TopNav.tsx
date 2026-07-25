import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Search, Menu } from "lucide-react";

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-navy-200 bg-white/95 px-4 dark:border-navy-800 dark:bg-navy-950/95 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-md text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800 md:hidden"
          >
            <Menu size={24} />
          </button>
        )}
        <div className="flex items-center gap-2">
          {/* We can put breadcrumbs here later */}
          <span className="text-lg font-semibold text-navy-900 dark:text-white">
            Dashboard
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-64 rounded-full border border-navy-200 bg-navy-50 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-navy-800 dark:bg-navy-900 dark:text-white dark:focus:border-navy-400 dark:focus:ring-navy-400 transition-all"
          />
        </div>
        
        <button className="relative p-2 rounded-full text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <ThemeToggle />

        <div className="h-8 w-8 overflow-hidden rounded-full border border-navy-200 dark:border-navy-700 bg-navy-100 dark:bg-navy-800 flex items-center justify-center cursor-pointer">
          <span className="text-sm font-medium text-navy-600 dark:text-navy-300">AD</span>
        </div>
      </div>
    </header>
  );
}
