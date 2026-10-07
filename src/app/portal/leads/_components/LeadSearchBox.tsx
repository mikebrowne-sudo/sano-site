'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

/** Quick search over the leads list — company, contact, or email. Updates the
 *  `q` URL param (debounced) so it composes with the status/grade filters. */
export function LeadSearchBox() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()))
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
      router.replace(`/portal/leads?${next.toString()}`)
    }, 250)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search company, contact, email…"
        className="w-full rounded-lg border border-sage-200 pl-9 pr-8 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
      />
      {value && (
        <button type="button" onClick={() => setValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
