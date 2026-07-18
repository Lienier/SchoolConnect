/** Composes all top-level context providers into a single wrapper. */
import { type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/features/auth/context/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryProvider>
  );
}

