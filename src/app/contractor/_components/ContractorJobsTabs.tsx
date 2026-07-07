'use client'

// Segmented "To do | Completed" switch for the contractor Jobs screen.
// Keeps the two views on one nav item without cramming everything onto one
// scroll: To-do is the action list (today / upcoming / overdue), Completed is
// the month-by-month history. Both are server-rendered and passed in as slots.

import { useState } from 'react'
import clsx from 'clsx'

export function ContractorJobsTabs({
  toDo,
  completed,
  completedCount,
}: {
  toDo: React.ReactNode
  completed: React.ReactNode
  completedCount: number
}) {
  const [tab, setTab] = useState<'todo' | 'completed'>('todo')

  return (
    <div>
      <div className="inline-flex p-1 rounded-xl bg-sage-50 border border-sage-100 mb-5">
        <TabButton active={tab === 'todo'} onClick={() => setTab('todo')}>To do</TabButton>
        <TabButton active={tab === 'completed'} onClick={() => setTab('completed')}>
          Completed{completedCount > 0 ? ` (${completedCount})` : ''}
        </TabButton>
      </div>
      <div className={tab === 'todo' ? '' : 'hidden'}>{toDo}</div>
      <div className={tab === 'completed' ? '' : 'hidden'}>{completed}</div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-white text-sage-800 shadow-sm' : 'text-sage-500 hover:text-sage-700',
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
