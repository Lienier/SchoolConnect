import { type HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <label className={cn("block text-sm font-medium text-navy-900")}>
          {label}
          {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {hint && !error && <p className="text-sm text-navy-500">{hint}</p>}
    </div>
  );
}

FormField.displayName = "FormField";