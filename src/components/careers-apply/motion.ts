import type { Variants } from 'framer-motion'

// Outer container: drives stagger order of its child motion elements.
export const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
}

// Standard step item: heading, body paragraph, input row. Used by all step types except info-style.
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }, // easeOut curve
  },
}

// Info-step item: slightly slower and a touch more vertical travel for a deliberate "pause" feel.
// Used by WelcomeStep, InfoStep, and SuccessStep.
export const infoVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 0.61, 0.36, 1] },
  },
}

// Shared button micro-interactions: subtle lift on hover, slight press on tap.
// Respected through whileHover/whileTap on motion.button.
export const buttonInteraction = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98 },
} as const
