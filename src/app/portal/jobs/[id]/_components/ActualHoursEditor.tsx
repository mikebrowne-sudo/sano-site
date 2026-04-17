'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react'
import { updateWorkerActualHours } from '../_actions'

type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function ActualHoursEditor({
  jobId,
  contractorId,
  currentHours,
}: {
  jobId: string
  contractorId: string
  currentHours: number | null
}) {
  const initial = currentHours != null ? String(currentHours) : ''
  const [hours, setHours] = useState(initial)
  const savedValueRef = useRef<string>(initial)
  const [status, setStatus] = useState<Status>('idle')
  const [isPending, startTransition] = useTransition()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  function attemptSave(raw: string) {
    const normalized = String(parseFloat(raw) || 0)
    if (normalized === savedValueRef.current) {
      setStatus('idle')
      return
    }
    setStatus('saving')
    startTransition(async () => {
      const result = await updateWorkerActualHours(jobId, contractorId, parseFloat(raw) || 0)
      if (result?.error) {
        setStatus('error')
        return
      }
      savedValueRef.current = normalized
      setStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000)
    })
  }

  function handleChange(next: string) {
    setHours(next)
    setStatus(next === savedValueRef.current ? 'idle' : 'dirty')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setHours(savedValueRef.current)
      setStatus('idle')
      e.currentTarget.blur()
    }
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <input
        type="number"
        step="0.25"
        min="0"
        value={hours}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => attemptSave(hours)}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="w-16 rounded border border-sage-200 px-2 py-1 text-xs text-sage-800 text-right focus:outline-none focus:ring-1 focus:ring-sage-500 disabled:bg-sage-50"
      />
      <StatusChip status={status} onRetry={() => attemptSave(hours)} />
    </div>
  )
}

function StatusChip({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const base = 'inline-flex items-center gap-1 text-[10px] font-medium w-[72px] justify-start'

  if (status === 'dirty') {
    return (
      <span className={`${base} text-sage-500`}>
        <Circle size={10} />
        Unsaved
      </span>
    )
  }
  if (status === 'saving') {
    return (
      <span className={`${base} text-sage-500`}>
        <Loader2 size={10} className="animate-spin" />
        Saving…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className={`${base} text-emerald-600`}>
        <Check size={10} />
        Saved
      </span>
    )
  }
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} text-red-600 hover:underline`}
      >
        <AlertCircle size={10} />
        Retry
      </button>
    )
  }
  return <span className={base} aria-hidden="true" />
}
