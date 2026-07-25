import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { X, ChevronDown, Settings, LogOut, User, Bell } from "lucide-react";

import { Button } from "./Button";
import { Avatar, AvatarImage, AvatarFallback } from "./Avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./DropdownMenu";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string | number;
  children?: NavItem[];
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  navigation: NavSection[];
  className?: string;
}

export function Sidebar({ isOpen, onClose, user, navigation, className }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-navy-900/40 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 flex flex-col border-r border-navy-100 bg-navy-800 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-navy-700 px-4 lg:hidden">
          <span className="text-lg font-semibold text-white">SchoolConnect</span>
          <button onClick={onClose} className="p-2 text-navy-300 hover:text-white" aria-label="Close sidebar">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex h-16 items-center justify-between border-b border-navy-700 px-4 hidden lg:flex">
          <span className="text-lg font-semibold text-white">SchoolConnect</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6" aria-label="Navigation menu">
          {navigation
            .filter((section) => section.items.some((item) => !item.roles || !user?.role || item.roles.includes(user.role)))
            .map((section, sectionIndex) => (
              <div key={`${section.title}-${sectionIndex}`}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items
                    .filter((item) => !item.roles || !user?.role || item.roles.includes(user.role))
                    .map((item, itemIndex) => (
                      <NavItem key={`${section.title}-${itemIndex}-${item.href}`} item={item} location={location} userRole={user?.role} onClose={onClose} />
                    ))}
                </div>
              </div>
            ))}
        </nav>
        <div className="border-t border-navy-700 p-4">
          {user && (
            <div className="mb-3 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-navy-300 truncate">{user.role}</p>
              </div>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-left text-navy-300 hover:text-white hover:bg-navy-700">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-navy-500">Account</DropdownMenuLabel>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onClose}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

interface NavItemProps {
  item: NavItem;
  location: ReturnType<typeof useLocation>;
  userRole?: string;
  onClose?: () => void;
  depth?: number;
}

function NavItem({ item, location, userRole, onClose, depth = 0 }: NavItemProps) {
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasChildren ? isActive : false);

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className={cn("group", depth > 0 && "pl-6")}>
      {hasChildren ? (
        <button
          onClick={handleClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400",
            isActive ? "bg-navy-700/50 text-white" : "text-navy-300 hover:bg-navy-700/50 hover:text-white"
          )}
          aria-expanded={isExpanded}
          aria-controls={`${item.href}-children`}
        >
          <span className="flex h-5 w-5 items-center justify-center text-navy-400 group-hover:text-navy-300">
            {item.icon}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-navy-700 text-navy-100">
              {item.badge}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-navy-400 transition-transform", isExpanded && "rotate-180")} />
        </button>
      ) : (
        <NavLink
          to={item.href}
          onClick={() => onClose?.()}
          className={({ isActive: active }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400",
            active
              ? "bg-navy-800 text-white"
              : "text-navy-300 hover:bg-navy-700/50 hover:text-white"
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center text-navy-400 group-hover:text-navy-300">
            {item.icon}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium bg-navy-700 text-navy-100 group-hover:bg-navy-600">
              {item.badge}
            </span>
          )}
        </NavLink>
      )}
      {hasChildren && isExpanded && (
        <div id={`${item.href}-children`} className="mt-1 space-y-1" role="group" aria-label={`${item.label} submenu`}>
          {item.children!
            .filter((child) => !child.roles || !userRole || child.roles.includes(userRole))
            .map((child) => (
              <NavItem key={child.href} item={child} location={location} userRole={userRole} onClose={onClose} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}