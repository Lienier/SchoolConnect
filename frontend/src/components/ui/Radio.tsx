import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const radioId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const describedBy = description ? `${radioId}-description` : undefined;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            aria-describedby={describedBy}
            className={cn(
              "h-4 w-4 border-navy-300 text-navy-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-colors duration-200",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-5">
            {label && (
              <label
                htmlFor={radioId}
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

Radio.displayName = "Radio";

export interface RadioGroupProps {
  label?: string;
  description?: string;
  error?: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  orientation?: "vertical" | "horizontal";
}

export function RadioGroup({
  label,
  description,
  error,
  name,
  value,
  onChange,
  children,
  required,
  orientation = "vertical",
}: RadioGroupProps) {
  const groupId = name;
  const errorId = error ? `${groupId}-error` : undefined;
  const descriptionId = description ? `${groupId}-description` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className="w-full" aria-describedby={describedBy}>
      {(label || description) && (
        <div className="mb-3">
          {label && (
            <legend className="text-sm font-medium text-navy-900">
              {label}
              {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
            </legend>
          )}
          {description && (
            <p id={descriptionId} className="mt-0.5 text-sm text-navy-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div
        className={cn(
          "space-y-3",
          orientation === "horizontal" && "flex flex-wrap gap-4"
        )}
        role="radiogroup"
        aria-label={label}
        aria-required={required}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            name,
            checked: child.props.value === value,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
          });
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function RadioGroupItem({
  value,
  label,
  description,
  disabled,
  ...props
}: {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
} & Omit<RadioProps, "value" | "label" | "description">) {
  return (
    <Radio value={value} label={label} description={description} disabled={disabled} {...props} />
  );
}