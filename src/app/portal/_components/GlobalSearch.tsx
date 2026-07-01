'use client'

// Portal-wide search box (topbar). Submits to /portal/search, which
// searches quotes, jobs and invoices together by number, address,
// client, or reference. Kept deliberately simple — a form that navigates
// to a full results page rather than a live dropdown.

import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useState } from 'react'

export function GlobalSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = q.trim()
    if (t) router.push(`/portal/search?q=${encodeURIComponent(t)}`)
  }

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search quotes, jobs, invoices…"
        aria-label="Search quotes, jobs and invoices"
        className="w-full rounded-lg border border-sage-200 bg-sage-50/40 pl-9 pr-3 py-1.5 text-sm text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:bg-white"
      />
    </form>
  )
}
