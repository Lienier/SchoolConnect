/** Composes all top-level context providers into a single wrapper. */
import { type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/features/auth/context/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <RealtimeProvider>{children}</RealtimeProvider>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
