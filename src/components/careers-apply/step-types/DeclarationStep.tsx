'use client'

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'

interface DeclarationStepProps {
  body: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string | null
}

export function DeclarationStep({ body, checked, onChange, error }: DeclarationStepProps) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.h2 variants={itemVariants} className="mb-6">One last thing.</motion.h2>
      <motion.label variants={itemVariants} className="flex items-start gap-3 cursor-pointer bg-sage-50 border border-sage-100 rounded-2xl p-6">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-sage-100 text-sage-800 focus:ring-sage-300"
        />
        <span className="text-base text-gray-700 leading-relaxed">{body}</span>
      </motion.label>
      {error && <motion.p variants={itemVariants} className="mt-2 text-sm text-red-500" role="alert">{error}</motion.p>}
    </motion.div>
  )
}
