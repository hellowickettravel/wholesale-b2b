"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  /** PNG of the signature, or null when nothing has been drawn. */
  toBlob(): Promise<Blob | null>;
  clear(): void;
}

/** Finger / mouse / pen signature on a canvas (pointer events, so it works on every phone). */
export function SignaturePad({ ref, label, onChange }: { ref: Ref<SignaturePadHandle>; label: string; onChange?: (signed: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [signed, setSigned] = useState(false);

  // Size the canvas to its box at device resolution, keeping lines crisp.
  useEffect(() => {
    const c = canvas.current!;
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width === Math.round(r.width * dpr) && c.height === Math.round(r.height * dpr)) return;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      setSigned(false);
      onChange?.(false);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [onChange]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
    onChange?.(false);
  };

  useImperativeHandle(ref, () => ({
    clear,
    toBlob: () =>
      new Promise((resolve) => {
        if (!signed) return resolve(null);
        // White background so the PNG reads well anywhere.
        const c = canvas.current!;
        const out = document.createElement("canvas");
        out.width = c.width;
        out.height = c.height;
        const ctx = out.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(c, 0, 0);
        out.toBlob(resolve, "image/png");
      }),
  }));

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvas}
          role="img"
          aria-label={signed ? `${label}: signed` : `${label}: sign here with a finger`}
          className="block h-44 w-full touch-none rounded-[var(--radius-md)] border-2 border-dashed border-line-strong bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = point(e);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const p = point(e);
            const ctx = e.currentTarget.getContext("2d")!;
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            if (!signed) {
              setSigned(true);
              onChange?.(true);
            }
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          onPointerCancel={() => {
            drawing.current = false;
            last.current = null;
          }}
        />
        {!signed ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-ink-subtle">Sign here</span>
        ) : null}
      </div>
      <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <Eraser className="size-4" aria-hidden="true" /> Clear signature
      </button>
    </div>
  );
}
