'use client'

import { motion } from 'framer-motion'
import { containerVariants, itemVariants } from '../motion'
import { OkButton } from '../OkButton'

interface TextareaStepProps {
  id: string
  question: string
  value: string
  onChange: (value: string) => void
  onNext: () => void
  placeholder?: string
  helper?: string
}

export function TextareaStep({ id, question, value, onChange, onNext, placeholder, helper }: TextareaStepProps) {
  const inputId = `step-${id}`

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onNext()
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.label variants={itemVariants} htmlFor={inputId} className="block text-2xl sm:text-3xl font-serif text-sage-800 mb-4 leading-tight">
        {question}
      </motion.label>
      {helper && <motion.p variants={itemVariants} className="text-sm text-gray-500 mb-4">{helper}</motion.p>}
      <motion.textarea
        variants={itemVariants}
        id={inputId}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-sage-100 px-4 py-4 text-base bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-none"
      />
      <motion.div variants={itemVariants} className="mt-6">
        <OkButton onClick={onNext} />
      </motion.div>
    </motion.div>
  )
}
