import type { Variants, Transition } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1    },
};

/** Apply to container — children that have their own variants will stagger */
export const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06 } },
};

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  show:   { opacity: 1, scale: 1,    y: 0  },
};

export const slideDown: Variants = {
  hidden: { height: 0,      opacity: 0 },
  show:   { height: "auto", opacity: 1 },
};

export const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const easeOut: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
};
