'use client'

// Staff action-centre checklist. Each open task deep-links to the page that
// completes it; a task auto-ticks + strikes through when its count hits zero.
// Every task has a "Help" toggle: on by default so a new user gets a plain
// how-to, dismissible per task (remembered in this browser) once they've got
// the hang of it. The task always links to the action area regardless.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronRight, Lightbulb, ListChecks } from 'lucide-react'
import clsx from 'clsx'
import type { StaffTask } from '@/lib/staff-tasks'

const LS_KEY = 'sano-task-help-hidden'

export function StaffTodoChecklist({ tasks }: { tasks: StaffTask[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      setHidden(JSON.parse(localStorage.getItem(LS_KEY) || '{}'))
    } catch {
      /* localStorage unavailable */
    }
    setReady(true)
  }, [])

  function toggleHelp(key: string) {
    setHidden((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next))
      } catch {
        /* noop */
      }
      return next
    })
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-sage-800">
          <ListChecks size={16} className="text-sage-500" /> To-do
        </h2>
        <span className={clsx('text-xs font-medium', open.length === 0 ? 'text-emerald-600' : 'text-amber-700')}>
          {open.length === 0 ? 'All done 🎉' : `${open.length} to action`}
        </span>
      </div>

      {open.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {open.map((t) => {
            // Help shown by default; hidden once dismissed. Before localStorage
            // loads we default to shown so SSR and first paint agree.
            const showHelp = !ready || !hidden[t.key]
            return (
              <li key={t.key}>
                <div className="flex items-center gap-2 px-5 py-3">
                  <Link href={t.href} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <Circle size={18} className="text-sage-300 shrink-0" />
                    <span className="text-sm font-medium text-sage-800 group-hover:text-sage-600 truncate">{t.title}</span>
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold tabular-nums">
                      {t.count}
                    </span>
                    <ChevronRight size={15} className="text-sage-300 ml-auto shrink-0" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleHelp(t.key)}
                    className={clsx(
                      'shrink-0 inline-flex items-center gap-1 text-[11px] font-medium rounded-lg px-2 py-1 transition-colors',
                      showHelp ? 'text-sage-600 bg-sage-50' : 'text-sage-400 hover:text-sage-600',
                    )}
                    aria-pressed={showHelp}
                    title={showHelp ? 'Hide the how-to' : 'Show me how'}
                  >
                    <Lightbulb size={12} /> {showHelp ? 'Hide' : 'Help'}
                  </button>
                </div>
                {showHelp && (
                  <div className="px-5 pb-3 -mt-1">
                    <div className="flex items-start gap-2 rounded-lg bg-sage-50 border border-sage-100 px-3 py-2 text-xs text-sage-600 leading-relaxed">
                      <Lightbulb size={13} className="text-sage-400 mt-0.5 shrink-0" />
                      <span>{t.helper}</span>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="px-5 py-6 text-center text-sm text-sage-500">
          Nothing to action right now — you&apos;re all caught up.
        </div>
      )}

      {done.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/40">
          <ul className="space-y-1.5">
            {done.map((t) => (
              <li key={t.key} className="flex items-center gap-2 text-sm text-sage-400">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="line-through">{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
