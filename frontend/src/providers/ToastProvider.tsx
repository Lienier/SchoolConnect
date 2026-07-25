/** Toast notifications using the new design system Toast component. */
import { ToastProvider as ToastUIProvider, ToastViewport, useToast as useToastUI } from "@/components/ui/Toast";
import { createContext, useContext, useCallback, type ReactNode } from "react";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toast: toastUI, dismiss } = useToastUI();

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const variantMap: Record<ToastType, "default" | "success" | "error" | "warning" | "info"> = {
      default: "default",
      success: "success",
      error: "error",
      warning: "warning",
      info: "info",
    };
    toastUI({
      title: type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Info",
      description: message,
      variant: variantMap[type],
    });
  }, [toastUI]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastUIProvider>
        <ToastViewport />
      </ToastUIProvider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return ctx;
}