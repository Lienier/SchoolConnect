import { Link, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import {
  Menu,
  X,
  ChevronDown,
  Search,
  Bell,
  User,
  Settings,
  Moon,
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Megaphone,
  Award,
  QrCode,
  History,
  FileText,
  School,
  UserCheck,
} from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "./DropdownMenu";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavbarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  actions?: ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}

export function Navbar({
  title,
  breadcrumbs,
  user,
  actions,
  showSearch = true,
  searchQuery = "",
  onSearchChange,
  className,
}: NavbarProps) {
  const location = useLocation();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-navy-100 bg-white px-6 shadow-card",
        "lg:px-8",
        className
      )}
      role="banner"
    >
      <button
        className="lg:hidden rounded-lg p-2 text-navy-600 hover:bg-navy-50"
        aria-label="Open menu"
        aria-expanded="false"
      >
        <Menu className="h-6 w-6" />
      </button>

      <nav className="flex-1 flex items-center gap-4 min-w-0" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm flex-wrap">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, index) => (
              <li key={crumb.href || index} className="flex items-center gap-2 whitespace-nowrap">
                {index > 0 && <ChevronDown className="h-4 w-4 text-navy-400 flex-shrink-0" />}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-navy-500 hover:text-navy-700 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-navy-900 font-medium truncate">{crumb.label}</span>
                )}
              </li>
            ))
          ) : (
            <li>
              <span className="text-navy-900 font-medium truncate">{title}</span>
            </li>
          )}
        </ol>
      </nav>

      <div className="flex items-center gap-3 flex-shrink-0">
        {showSearch && (
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-10 w-64 pl-10 pr-4 text-sm bg-navy-50 border-navy-200 focus:border-navy-500"
              aria-label="Search"
            />
          </div>
        )}

        {actions}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl text-navy-600 hover:bg-navy-50">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" aria-label="3 unread notifications" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-medium">Notifications</DropdownMenuLabel>
            <DropdownMenuItem className="text-navy-500">No new notifications</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => {}}>View all notifications</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 rounded-xl px-3 py-1.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-navy-900">{user?.name}</p>
                <p className="text-xs text-navy-500">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-navy-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-medium">Account</DropdownMenuLabel>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Moon className="mr-2 h-4 w-4" />
              Dark Mode
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}