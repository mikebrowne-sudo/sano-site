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
      className="max-w-xl mx-auto text-left"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {resolvedTitle && (
        <motion.h2 variants={infoVariants} className="mb-6">{resolvedTitle}</motion.h2>
      )}
      {paragraphs.map((paragraph, i) => {
        const isFirst = i === 0
        const isSecondary = i === 1 && paragraphs.length > 2
        const isLast = i === paragraphs.length - 1

        const textClass = isFirst
          ? 'font-medium text-sage-800 text-lg leading-relaxed'
          : 'body-text'

        const gapClass = isLast
          ? 'mb-0'
          : isSecondary
            ? 'mb-6'
            : 'mb-4'

        return (
          <motion.p
            key={i}
            variants={infoVariants}
            className={`${textClass} ${gapClass}`}
          >
            {paragraph}
          </motion.p>
        )
      })}
    </motion.div>
  )
}
