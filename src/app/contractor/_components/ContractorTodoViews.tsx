'use client'

// List | Week switch for the contractor "To do" tab. The choice is remembered
// on the device, so a contractor who prefers the week opens straight into it.

import { useEffect, useState } from 'react'
import { CalendarDays, List } from 'lucide-react'
import clsx from 'clsx'
import { ContractorWeekView, type WeekJob } from './ContractorWeekView'

type View = 'list' | 'week'
const KEY = 'sano.contractor.jobsView'

export function ContractorTodoViews({
  list,
  weekJobs,
  todayIso,
}: {
  list: React.ReactNode
  weekJobs: WeekJob[]
  todayIso: string
}) {
  const [view, setView] = useState<View>('list')

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === 'week') setView('week')
    } catch { /* storage blocked — default to list */ }
  }, [])

  function choose(v: View) {
    setView(v)
    try { window.localStorage.setItem(KEY, v) } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full bg-white p-0.5 ring-1 ring-sage-100" role="tablist" aria-label="Jobs view">
          <Seg active={view === 'list'} onClick={() => choose('list')} icon={List} label="List" />
          <Seg active={view === 'week'} onClick={() => choose('week')} icon={CalendarDays} label="Week" />
        </div>
      </div>
      {view === 'week' ? <ContractorWeekView jobs={weekJobs} todayIso={todayIso} /> : list}
    </div>
  )
}

function Seg({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof List; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-sage-500 text-white shadow-sm' : 'text-sage-500 hover:text-sage-700',
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
