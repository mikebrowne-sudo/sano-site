'use client'

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'
import { OkButton } from '../OkButton'

interface Option { value: string; label: string }

interface ChipMultiStepProps {
  id: string
  question: string
  helper?: string
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  onNext: () => void
  error?: string | null
}

export function ChipMultiStep({ id, question, helper, options, value, onChange, onNext, error }: ChipMultiStepProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.h2 variants={itemVariants} className="mb-3" id={`step-${id}-label`}>{question}</motion.h2>
      {helper && <motion.p variants={itemVariants} className="text-sm text-gray-500 mb-6">{helper}</motion.p>}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2" role="group" aria-labelledby={`step-${id}-label`}>
        {options.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt.value)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
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
