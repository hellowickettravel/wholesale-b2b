"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastItem = { id: number; tone: "success" | "danger"; message: string };
const Ctx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex max-w-md items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-white shadow-lg",
              t.tone === "success" ? "bg-ink" : "bg-danger",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 className="size-4 text-accent" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
