'use client'

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'

interface YesNoStepProps {
  id: string
  question: string
  value: boolean | null
  onChange: (v: boolean) => void
  error?: string | null
}

export function YesNoStep({ id, question, value, onChange, error }: YesNoStepProps) {
  const pill = (selected: boolean) =>
    `px-8 py-4 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      selected
        ? 'bg-sage-800 text-white border-sage-800'
        : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
    }`

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.h2 variants={itemVariants} id={`step-${id}-label`} className="mb-8">{question}</motion.h2>
      <motion.div variants={itemVariants} role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex gap-4">
        <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)} className={pill(value === true)}>
          Yes
        </button>
        <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)} className={pill(value === false)}>
          No
        </button>
      </motion.div>
      {error && <motion.p variants={itemVariants} className="mt-4 text-sm text-red-500" role="alert">{error}</motion.p>}
    </motion.div>
  )
}
