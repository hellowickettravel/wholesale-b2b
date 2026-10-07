import { useReducedMotion } from "framer-motion";

/** Mirrors `--ease-out` in tokens.css. Keep the two in sync. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Collapse a list row or a revealed field: height 200ms (the layout move), opacity 120ms (content is gone before it can look squashed). */
const collapseTransition = {
  height: { duration: 0.2, ease: EASE_OUT },
  opacity: { duration: 0.12, ease: EASE_OUT },
  marginBottom: { duration: 0.2, ease: EASE_OUT },
} as const;

const INSTANT = { duration: 0 } as const;

/**
 * Transition for collapse/reveal. Under reduced motion it is `{ duration: 0 }`: motion would otherwise still
 * animate height and opacity, and tests and axe must never sample a screen mid-animation.
 */
export function useCollapseTransition() {
  return useReducedMotion() ? INSTANT : collapseTransition;
}

/** True when the user prefers reduced motion (so a component can skip an exit animation altogether). */
export function useInstant() {
  return useReducedMotion() === true;
}
