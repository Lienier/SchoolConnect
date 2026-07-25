import { type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export type AlertVariant = "default" | "success" | "warning" | "error" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  onClose?: () => void;
  showIcon?: boolean;
}

const variants: Record<AlertVariant, string> = {
  default: "bg-navy-50 border-navy-200 text-navy-900",
  success: "bg-green-50 border-green-200 text-green-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  error: "bg-red-50 border-red-200 text-red-900",
  info: "bg-sky-50 border-sky-200 text-sky-900",
};

const icons: Record<AlertVariant, React.ElementType> = {
  default: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

export function Alert({
  variant = "default",
  title,
  description,
  onClose,
  showIcon = true,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "relative flex gap-3 rounded-lg border p-4",
        variants[variant],
        className
      )}
      {...props}
    >
      {showIcon && (
        <div className="flex shrink-0 items-start">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium">{title}</h4>}
        {description && (
          <p className="mt-1 text-sm opacity-90">{description}</p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            "absolute right-3 top-3 rounded-md p-1 opacity-50",
            "hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2",
            variant === "default" && "hover:bg-navy-200 focus:ring-navy-500",
            variant === "success" && "hover:bg-green-200 focus:ring-green-500",
            variant === "warning" && "hover:bg-amber-200 focus:ring-amber-500",
            variant === "error" && "hover:bg-red-200 focus:ring-red-500",
            variant === "info" && "hover:bg-sky-200 focus:ring-sky-500"
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

Alert.displayName = "Alert";