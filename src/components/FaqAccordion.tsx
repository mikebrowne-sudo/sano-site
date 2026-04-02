'use client'

import { useState } from 'react'
import type { FaqCategory } from '@/types'

interface FaqAccordionProps {
  categories: FaqCategory[]
}

export function FaqAccordion({ categories }: FaqAccordionProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  function toggle(key: string) {
    setOpenKey(openKey === key ? null : key)
  }

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <section key={cat.category}>
          <h2 className="text-sage-800 mb-4">{cat.category}</h2>
          <dl className="space-y-2">
            {cat.items.map((item) => {
              const key = `${cat.category}-${item.question}`
              const isOpen = openKey === key
              return (
                <div key={key} className="border border-sage-100 rounded-2xl overflow-hidden">
                  <dt>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-gray-800 hover:bg-sage-50 transition-colors"
                      aria-expanded={isOpen}
                    >
                      {item.question}
                      <span className="ml-4 text-sage-500 text-lg shrink-0" aria-hidden="true">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                  </dt>
                  {isOpen && (
                    <dd className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-sage-100 pt-4">
                      {item.answer}
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}
