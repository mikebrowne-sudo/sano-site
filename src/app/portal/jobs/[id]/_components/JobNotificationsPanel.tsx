'use client'

// Phase H — manual SMS panel on the staff job page.
//
// Renders one or two buttons (depending on which phone numbers are
// available). Calls the manual-send actions which apply every
// notification gate; the inline flash reflects sent / skipped /
// failed with a short reason.

import { useState, useTransition } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import {
  sendContractorJobAssignedSms,
  sendCustomerBookingConfirmationSms,
} from '../_actions-notify'

export interface JobNotificationsPanelProps {
  jobId: string
  hasContractorPhone: boolean
  hasCustomerPhone: boolean
}

export function JobNotificationsPanel({
  jobId,
  hasContractorPhone,
  hasCustomerPhone,
}: JobNotificationsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!hasContractorPhone && !hasCustomerPhone) return null

  function run(action: () => Promise<{ status: 'sent' | 'failed' | 'skipped'; reason?: string } | { error: string }>) {
    setFlash(null)
    setError(null)
    startTransition(async () => {
      const result = await action()
      if ('error' in result) {
        setError(result.error)
        return
      }
      if (result.status === 'sent') {
        setFlash('SMS sent.')
      } else if (result.status === 'skipped') {
        setFlash(`SMS skipped — ${result.reason ?? 'gated by settings.'}`)
      } else {
        setFlash(`SMS failed — ${result.reason ?? 'unknown error.'}`)
      }
      window.setTimeout(() => setFlash(null), 4000)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasContractorPhone && (
        <button
          type="button"
          onClick={() => run(() => sendContractorJobAssignedSms(jobId))}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-xs hover:bg-sage-50 transition-colors disabled:opacity-50"
        >
          <MessageCircle size={14} />
          {isPending ? 'Sending…' : 'Send contractor SMS'}
        </button>
      )}
      {hasCustomerPhone && (
        <button
          type="button"
          onClick={() => run(() => sendCustomerBookingConfirmationSms(jobId))}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-xs hover:bg-sage-50 transition-colors disabled:opacity-50"
        >
          <Send size={14} />
          {isPending ? 'Sending…' : 'Send customer SMS'}
        </button>
      )}
      {flash && <span className="text-[11px] text-sage-700">{flash}</span>}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  )
}
