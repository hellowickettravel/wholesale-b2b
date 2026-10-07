"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastItem = { id: number; tone: "success" | "danger"; message: string };
const Ctx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

const SHOW_MS = 4500;
const MIN_LEFT_MS = 1500; // after a hover or focus, never leave less than this before it goes
const EXIT_MS = 140; // must equal .toast-out in globals.css

/**
 * One toast: slides up on arrival, leaves quickly, waits while hovered or focused, can be dismissed.
 * `superseded` means a newer toast has arrived: this one plays its exit under it and is removed, so only one
 * toast is ever on screen and a second add never shoves the first one up.
 */
function ToastView({ item, superseded, onDone }: { item: ToastItem; superseded: boolean; onDone: (id: number) => void }) {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(SHOW_MS);
  const isClosing = closing || superseded;

  useEffect(() => {
    if (isClosing || paused) return;
    const started = Date.now();
    const t = setTimeout(() => setClosing(true), left.current);
    return () => {
      clearTimeout(t);
      left.current = Math.max(MIN_LEFT_MS, left.current - (Date.now() - started));
    };
  }, [isClosing, paused]);

  useEffect(() => {
    if (!isClosing) return;
    const t = setTimeout(() => onDone(item.id), EXIT_MS);
    return () => clearTimeout(t);
  }, [isClosing, item.id, onDone]);

  const danger = item.tone === "danger";
  return (
    <div
      role={danger ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "col-start-1 row-start-1 flex min-h-12 max-w-md items-center gap-2.5 rounded-[var(--radius-md)] py-1 pl-4 pr-1 text-sm font-semibold shadow-pop",
        danger ? "bg-danger text-primary-ink" : "bg-dark text-on-dark",
        isClosing ? "toast-out pointer-events-none" : "pointer-events-auto motion-safe:animate-toast-in",
      )}
    >
      {danger ? (
        <XCircle className="size-5 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-5 shrink-0 text-accent" aria-hidden="true" />
      )}
      <span className="min-w-0 py-2">{item.message}</span>
      <button
        type="button"
        onClick={() => setClosing(true)}
        aria-label="Dismiss notification"
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-sm)] opacity-80 transition-[opacity,background-color] duration-[var(--dur-fast)] hover:bg-white/15 hover:opacity-100 focus-visible:outline-focus-on-dark"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { ...t, id }]);
  }, []);
  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 grid items-end justify-items-center px-4 sm:bottom-6"
      >
        {/* One cell: toasts stack on top of each other, so nothing is pushed around when a new one arrives. */}
        {items.map((t, i) => (
          <ToastView key={t.id} item={t} superseded={i < items.length - 1} onDone={remove} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
