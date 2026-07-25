import { type LabelHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = ({ className, required, children, ...props }: LabelProps) => {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-navy-900",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
    </label>
  );
};

Label.displayName = "Label";