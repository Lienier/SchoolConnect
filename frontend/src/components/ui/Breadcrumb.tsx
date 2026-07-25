import { Link } from "react-router-dom";
import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: ReactNode;
}

export function Breadcrumb({ items, className, separator = <ChevronRight className="h-4 w-4" /> }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center gap-2", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={item.href || index} className="flex items-center gap-2">
            {index > 0 && <span className="text-navy-400" aria-hidden="true">{separator}</span>}
            {item.href ? (
              <Link
                to={item.href}
                className="text-navy-500 hover:text-navy-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-navy-900 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BreadcrumbItem({ children, href, className }: { children: ReactNode; href?: string; className?: string }) {
  if (href) {
    return <Link to={href} className={cn("text-navy-500 hover:text-navy-700 transition-colors", className)}>{children}</Link>;
  }
  return <span className={cn("text-navy-900 font-medium", className)} aria-current="page">{children}</span>;
}

export function BreadcrumbSeparator({ children = <ChevronRight className="h-4 w-4" />, className }: { children?: ReactNode; className?: string }) {
  return <span className={cn("text-navy-400", className)} aria-hidden="true">{children}</span>;
}