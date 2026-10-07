import { domAnimation } from "framer-motion";

/**
 * The animation feature bundle for `LazyMotion`. Loaded with a dynamic import from `MotionRoot`, so it is its
 * own chunk and never part of a route's first-load JavaScript. `domAnimation` is enough for everything here
 * (animate, exit, variants); `domMax` is only needed for layout, layoutId, drag and Reorder, which nothing uses.
 */
export default domAnimation;
