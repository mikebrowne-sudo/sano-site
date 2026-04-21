'use client'

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'
import { OkButton } from '../OkButton'

interface Option { value: string; label: string }

interface ChipSingleStepProps {
  id: string
  question: string
  options: Option[]
  value: string
  onChange: (v: string) => void
  onNext: () => void
  error?: string | null
}

export function ChipSingleStep({ id, question, options, value, onChange, onNext, error }: ChipSingleStepProps) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.h2 variants={itemVariants} id={`step-${id}-label`} className="mb-8">{question}</motion.h2>
      <motion.div variants={itemVariants} role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`px-6 py-3 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
                selected ? 'bg-sage-800 text-white border-sage-800' : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </motion.div>
      {error && <motion.p variants={itemVariants} className="mt-4 text-sm text-red-500" role="alert">{error}</motion.p>}
      <motion.div variants={itemVariants} className="mt-6">
        <OkButton onClick={onNext} />
      </motion.div>
    </motion.div>
  )
}
