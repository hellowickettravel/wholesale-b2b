"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * Mount once around the client component that animates with `motion`; nothing else may import the library.
 *
 * Import from "framer-motion", not "motion/react". They are the same API (`motion` is a thin package that
 * re-exports `framer-motion`, installed with it at the same pinned version), but Turbopack does not
 * tree-shake the `motion/react` entry well (it is an `import * as` plus `export *` barrel): measured on
 * /basket, +45 kB gzipped instead of +20 kB. If Turbopack's tree shaking improves, switching the four imports
 * in src/components/motion/* and the basket route back to "motion/react" is safe.
 *
 * Rules (also in MEMORY.md):
 *  - use `m.*` only, never `motion.*` (`strict` throws in development if a `motion.*` component renders here);
 *  - features load after hydration and never block it; until they arrive `m` renders a plain element and an
 *    exit is simply instant;
 *  - never give server-rendered, above-the-fold content a hidden `initial` (it would ship hidden in the HTML);
 *  - no `transition-*` class on an element motion animates;
 *  - `inert` on an exiting row.
 *
 * `reducedMotion="user"` only switches transform animations off. Height and opacity would still animate, so
 * every transition in this app also goes through `./presets`, which makes reduced motion instant.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
