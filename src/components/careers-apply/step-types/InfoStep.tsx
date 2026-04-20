'use client'

import type { ApplicationFormData } from '@/types/application'

interface InfoStepProps {
  data: ApplicationFormData
  title?: string | ((d: ApplicationFormData) => string)
  body: string | ((d: ApplicationFormData) => string)
}

export function InfoStep({ data, title, body }: InfoStepProps) {
  const resolvedTitle = typeof title === 'function' ? title(data) : title
  const resolvedBody = typeof body === 'function' ? body(data) : body

  return (
    <div className="text-center">
      {resolvedTitle && <h2 className="mb-6">{resolvedTitle}</h2>}
      <p className="body-text max-w-lg mx-auto">{resolvedBody}</p>
    </div>
  )
}
