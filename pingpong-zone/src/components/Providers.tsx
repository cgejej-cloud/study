"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/Toast";

function GlobalErrorHandler() {
  useEffect(() => {
    function sendError(message: string, stack?: string) {
      const url = typeof window !== "undefined" ? window.location.href : undefined;
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stack, url }),
      }).catch(() => {});
    }

    const handleError = (event: ErrorEvent) => {
      sendError(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      sendError(message, stack);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <GlobalErrorHandler />
      {children}
    </ToastProvider>
  );
}
