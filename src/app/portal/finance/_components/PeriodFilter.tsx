'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { getPeriods } from '../_lib/periods'
import clsx from 'clsx'

export function PeriodFilter({ current, customFrom, customTo, basePath = '/portal/finance' }: { current: string; customFrom?: string; customTo?: string; basePath?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Preserve any OTHER filters already in the URL (invoiced / customer / sort on
  // the job-margins report); only replace the period-related params.
  function push(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [k, v] of Object.entries(next)) {
      if (v == null) params.delete(k)
      else params.set(k, v)
    }
    router.push(`${basePath}?${params.toString()}`)
  }
  const periods = getPeriods()

  function select(key: string) {
    push({ period: key, from: null, to: null })
  }

  function handleCustom() {
    const from = customFrom || new Date().toISOString().slice(0, 10)
    const to = customTo || new Date().toISOString().slice(0, 10)
    push({ period: 'custom', from, to })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => select(p.key)}
          className={clsx(
            'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
            current === p.key ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200',
          )}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={handleCustom}
        className={clsx(
          'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
          current === 'custom' ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200',
        )}
      >
        Custom
      </button>

      {current === 'custom' && (
        <form className="flex items-center gap-2 ml-2" onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          push({ period: 'custom', from: String(fd.get('from') ?? ''), to: String(fd.get('to') ?? '') })
        }}>
          <input name="from" type="date" defaultValue={customFrom} className="rounded-lg border border-sage-200 px-3 py-2 text-sm" />
          <span className="text-sage-400">–</span>
          <input name="to" type="date" defaultValue={customTo} className="rounded-lg border border-sage-200 px-3 py-2 text-sm" />
          <button type="submit" className="px-3 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-700 transition-colors">Apply</button>
        </form>
      )}
    </div>
  )
}
