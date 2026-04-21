'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { buttonInteraction } from './motion'

interface OkButtonProps {
  onClick: () => void
  disabled?: boolean
}

// Inline secondary action placed under the input area. Clicking delegates to the
// same next handler the bottom Next button uses — no duplicate validation logic.
export function OkButton({ onClick, disabled }: OkButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={buttonInteraction.whileHover}
      whileTap={buttonInteraction.whileTap}
      className="inline-flex items-center gap-2 rounded-lg border border-sage-200 bg-white px-4 py-2 text-sm font-medium text-sage-800 hover:bg-sage-50 focus:outline-none focus:ring-2 focus:ring-sage-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      OK
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </motion.button>
  )
}
