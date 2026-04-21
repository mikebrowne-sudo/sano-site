'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'

interface DateStepProps {
  id: string
  question: string
  helper?: string
  value: string | null
  onChange: (v: string | null) => void
  onSkip: () => void
}

export function DateStep({ id, question, helper, value, onChange, onSkip }: DateStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [id])

  const inputId = `step-${id}`

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.label variants={itemVariants} htmlFor={inputId} className="block text-2xl sm:text-3xl font-serif text-sage-800 mb-4 leading-tight">
        {question}
      </motion.label>
      {helper && <motion.p variants={itemVariants} className="text-sm text-gray-500 mb-6">{helper}</motion.p>}
      <motion.input
        variants={itemVariants}
        ref={inputRef}
        id={inputId}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="w-full rounded-xl border border-sage-100 px-4 py-4 text-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
      />
      <motion.button
        variants={itemVariants}
        type="button"
        onClick={onSkip}
        className="mt-4 text-sm text-sage-600 hover:text-sage-800 underline-offset-2 hover:underline transition-colors"
      >
        Skip this question
      </motion.button>
    </motion.div>
  )
}
