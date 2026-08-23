/** Accessible modal dialog (shadcn/ui new-york style). */
import { type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, title, onClose, children, footer, className }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border border-navy-100 bg-white p-6 shadow-soft",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
