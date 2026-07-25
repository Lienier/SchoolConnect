import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const describedBy = description ? `${switchId}-description` : undefined;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={switchId}
            aria-describedby={describedBy}
            className={cn(
              "peer h-6 w-11 appearance-none rounded-full border-2 border-navy-300 bg-navy-200",
              "after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm",
              "after:transition-all after:duration-200",
              "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-navy-400",
              "peer-checked:border-navy-800 peer-checked:bg-navy-800 peer-checked:after:translate-x-full",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-5">
            {label && (
              <label
                htmlFor={switchId}
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

Switch.displayName = "Switch";