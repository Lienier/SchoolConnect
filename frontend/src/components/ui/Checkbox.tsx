import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { Check } from "lucide-react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const describedBy = description ? `${checkboxId}-description` : undefined;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            aria-describedby={describedBy}
            className={cn(
              "h-4 w-4 rounded border-navy-300 text-navy-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-colors duration-200",
              className
            )}
            {...props}
          />
          {props.checked && (
            <Check className="absolute h-3.5 w-3.5 text-white" aria-hidden="true" />
          )}
        </div>
        {(label || description) && (
          <div className="text-sm leading-5">
            {label && (
              <label
                htmlFor={checkboxId}
                className="font-medium text-navy-900 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p id={describedBy} className="text-navy-500">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";