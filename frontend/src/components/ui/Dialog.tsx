import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "./Button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = DialogPrimitive.Overlay;

export const DialogContent = DialogPrimitive.Content;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = DialogPrimitive.Title;

export const DialogDescription = DialogPrimitive.Description;

export function DialogCloseButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-navy-100 data-[state=open]:text-navy-500",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}
DialogCloseButton.displayName = DialogPrimitive.Close.displayName;

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw]",
};

export function DialogWrapper({ open, onOpenChange, title, description, children, footer, maxWidth = "lg", className }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm" />
        <DialogContent className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-navy-100 bg-white p-6 shadow-soft duration-200 rounded-2xl sm:max-w-lg",
          maxWidthClasses[maxWidth],
          className
        )}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-navy-900">{title}</DialogTitle>
            {description && <DialogDescription className="text-sm text-navy-500">{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
          <DialogCloseButton />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const confirmVariant = variant === "danger" ? "danger" : variant === "warning" ? "secondary" : "primary";

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} isLoading={loading}>
            {confirmText}
          </Button>
        </div>
      }
    />
  );
}

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function AlertDialog({ open, onOpenChange, title, description, onConfirm, confirmText = "Continue", cancelText = "Cancel" }: AlertDialogProps) {
  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button variant="danger" onClick={() => { onConfirm(); onOpenChange(false); }}>
            {confirmText}
          </Button>
        </div>
      }
    />
  );
}