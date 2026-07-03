"use client";

/**
 * Motion helpers (design-language §4.4) — thin client wrappers so RSC pages
 * can compose staggered entrances without going client themselves.
 * All variants collapse to no-ops under prefers-reduced-motion.
 */
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise on mount. `delay` in seconds. */
export function FadeIn({
  delay = 0,
  y = 12,
  children,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Parent for StaggerItem children — cascades entrances. */
export function Stagger({
  children,
  staggerDelay = 0.06,
  ...rest
}: HTMLMotionProps<"div"> & { staggerDelay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: staggerDelay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
