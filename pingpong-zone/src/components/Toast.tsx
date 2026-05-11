"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "info" | "success" | "error";
type Toast = { id: number; message: string; type: ToastType };
type Ctx = { show: (message: string, type?: ToastType) => void };

const ToastCtx = createContext<Ctx | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
              t.type === "success" ? "bg-green-600 text-white" :
              t.type === "error"   ? "bg-red-500 text-white"   :
              "bg-gray-800 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx ?? { show: (m: string) => console.warn("[Toast no provider]", m) };
}
