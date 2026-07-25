import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import React, { type ReactNode, forwardRef, type Ref } from "react";
import { cn } from "@/utils/cn";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  Ref<typeof ToastPrimitive.Viewport>,
  ToastPrimitive.ViewportProps
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export type ToastProps = ToastPrimitive.ToastProps & {
  variant?: "default" | "success" | "error" | "warning" | "info";
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export const Toast = forwardRef<Ref<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, variant = "default", title, description, action, ...props }, ref) => {
    const variantClasses = {
      default: "bg-white border-navy-200",
      success: "bg-green-50 border-green-200",
      error: "bg-red-50 border-red-200",
      warning: "bg-amber-50 border-amber-200",
      info: "bg-sky-50 border-sky-200",
    };

    const iconComponents = {
      default: <svg className="h-5 w-5 text-navy-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
      success: <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
      error: <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
      warning: <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
      info: <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
    };

    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 shadow-soft",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
          "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0">{iconComponents[variant]}</div>
          <div className="flex-1 min-w-0">
            {title && <div className="font-medium text-navy-900">{title}</div>}
            {description && (
              <div className="mt-1 text-sm text-navy-600">{description}</div>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
        <ToastPrimitive.Close className="flex-shrink-0 p-1 text-navy-400 hover:text-navy-600">
          <X className="h-4 w-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  }
);
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;
export const ToastAction = ToastPrimitive.Action;

type Toast = ToastProps & { id?: string };

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(({ variant = "default", ...props }: Toast) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...props, id, variant };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}