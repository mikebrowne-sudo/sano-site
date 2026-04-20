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
  const paragraphs = resolvedBody.split('\n\n').filter((p) => p.trim().length > 0)

  return (
    <div className="text-center">
      {resolvedTitle && <h2 className="mb-6">{resolvedTitle}</h2>}
      <div className="max-w-lg mx-auto space-y-4">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="body-text">{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
