'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SERVICES } from '@/lib/services'

export function QuickQuoteBar() {
  const router = useRouter()
  const [service, setService] = useState('')
  const [postcode, setPostcode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (service) params.set('service', service)
    if (postcode) params.set('postcode', postcode)
    router.push(`/contact?${params.toString()}`)
  }

  return (
    <div className="section-padding -mt-7 relative z-10">
      <div className="container-max">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg shadow-sage-800/10 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        >
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="flex-1 rounded-xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sage-300"
            aria-label="Select a service"
          >
            <option value="">Select a service...</option>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Your postcode"
            className="flex-1 rounded-xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sage-300"
            aria-label="Your postcode"
          />
          <button
            type="submit"
            className="rounded-xl bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors whitespace-nowrap"
          >
            Get a Quote →
          </button>
        </form>
      </div>
    </div>
  )
}
