'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { containerVariants, infoVariants, buttonInteraction } from '../motion'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <motion.div
      className="text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.p variants={infoVariants} className="eyebrow mb-4">Application</motion.p>
      <motion.h1 variants={infoVariants} className="mb-6">Join the Sano team</motion.h1>
      <motion.p variants={infoVariants} className="body-text max-w-lg mx-auto mb-10">
        This should only take a few minutes. We&apos;ll ask a few quick questions to understand your experience and availability.
      </motion.p>
      <motion.button
        type="button"
        variants={infoVariants}
        whileHover={buttonInteraction.whileHover}
        whileTap={buttonInteraction.whileTap}
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
      >
        Start application
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </motion.button>
    </motion.div>
  )
}
