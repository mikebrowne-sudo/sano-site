'use client'

import { useRouter } from 'next/navigation'
import { getPeriods } from '../_lib/periods'
import clsx from 'clsx'

export function PeriodFilter({ current, customFrom, customTo }: { current: string; customFrom?: string; customTo?: string }) {
  const router = useRouter()
  const periods = getPeriods()

  function select(key: string) {
    router.push(`/portal/finance?period=${key}`)
  }

  function handleCustom() {
    const from = customFrom || new Date().toISOString().slice(0, 10)
    const to = customTo || new Date().toISOString().slice(0, 10)
    router.push(`/portal/finance?period=custom&from=${from}&to=${to}`)
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
          router.push(`/portal/finance?period=custom&from=${fd.get('from')}&to=${fd.get('to')}`)
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
