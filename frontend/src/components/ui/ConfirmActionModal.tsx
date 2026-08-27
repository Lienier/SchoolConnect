import { type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ConfirmVariant = "primary" | "danger" | "secondary";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  itemName?: string | null;
  confirmLabel: string;
  confirmVariant?: ConfirmVariant;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  itemName,
  confirmLabel,
  confirmVariant = "primary",
  isLoading,
  confirmDisabled,
  onCancel,
  onConfirm,
  children,
}: ConfirmActionModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={isLoading ? () => undefined : onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {itemName && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-navy-900 dark:border-navy-800 dark:bg-navy-900 dark:text-white">
            {itemName}
          </p>
        )}
        <p className="text-sm leading-6 text-slate-600 dark:text-navy-300">{description}</p>
        {children}
      </div>
    </Modal>
  );
}
