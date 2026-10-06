"use client";

import { useEffect } from "react";

/** Lets "#<id>" links (the header search) land in the search box with the keyboard ready. */
export function SearchFocus({ inputId }: { inputId: string }) {
  useEffect(() => {
    const focus = () => {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.focus({ preventScroll: true });
    };
    if (window.location.hash === `#${inputId}`) focus();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href")?.endsWith(`#${inputId}`)) requestAnimationFrame(focus);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [inputId]);
  return null;
}
