'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'

interface TextStepProps {
  id: string
  question: string
  value: string
  onChange: (value: string) => void
  onNext: () => void
  inputType?: 'text' | 'tel' | 'email'
  placeholder?: string
  error?: string | null
}

export function TextStep({ id, question, value, onChange, onNext, inputType = 'text', placeholder, error }: TextStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [id])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onNext()
    }
  }

  const inputId = `step-${id}`

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.label variants={itemVariants} htmlFor={inputId} className="block text-2xl sm:text-3xl font-semibold text-sage-800 mb-6 leading-tight">
        {question}
      </motion.label>
      <motion.input
        variants={itemVariants}
        ref={inputRef}
        id={inputId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete={
          inputType === 'email' ? 'email' :
          inputType === 'tel' ? 'tel' :
          'off'
        }
        className={`w-full rounded-xl border px-4 py-4 text-lg bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 ${
          error ? 'border-red-300' : 'border-sage-100'
        }`}
      />
      {error && <motion.p variants={itemVariants} className="mt-2 text-sm text-red-500" role="alert">{error}</motion.p>}
    </motion.div>
  )
}
