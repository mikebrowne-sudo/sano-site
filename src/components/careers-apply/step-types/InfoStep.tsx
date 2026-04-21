'use client'

import { motion } from 'framer-motion'
import type { ApplicationFormData } from '@/types/application'
import { containerVariants, infoVariants } from '../motion'

interface InfoStepProps {
  data: ApplicationFormData
  title?: string | ((d: ApplicationFormData) => string)
  body: string | ((d: ApplicationFormData) => string)
}

export function InfoStep({ data, title, body }: InfoStepProps) {
  const resolvedTitle = typeof title === 'function' ? title(data) : title
  const resolvedBody = typeof body === 'function' ? body(data) : body
  const paragraphs = resolvedBody.split('\n\n').filter((p) => p.trim().length > 0)

  return (
    <motion.div
      className="text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {resolvedTitle && (
        <motion.h2 variants={infoVariants} className="mb-6">{resolvedTitle}</motion.h2>
      )}
      <div className="max-w-lg mx-auto space-y-4">
        {paragraphs.map((paragraph, i) => (
          <motion.p key={i} variants={infoVariants} className="body-text">
            {paragraph}
          </motion.p>
        ))}
      </div>
    </motion.div>
  )
}
