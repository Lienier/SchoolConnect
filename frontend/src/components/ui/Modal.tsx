/** Accessible modal dialog (shadcn/ui new-york style). */
import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/55 backdrop-blur-sm" />
      <Dialog.Content aria-describedby={undefined}
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-navy-950/10 dark:border-navy-800 dark:bg-navy-950 dark:text-navy-100 dark:shadow-none",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <Dialog.Title className="text-lg font-semibold text-navy-900 dark:text-white">{title}</Dialog.Title>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-slate-100 hover:text-navy-800 dark:text-navy-400 dark:hover:bg-navy-800 dark:hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
