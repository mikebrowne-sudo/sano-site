'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Check, Loader2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { formatDateTime } from '@/lib/format'
import { sendContractorRemittance } from '@/app/portal/contractor-invoices/_actions-send-remittance'

// Admin Send control for a saved remittance. V1: no resend — once sent,
// shows the sent timestamp and the button is gone. Inline two-step
// confirm (no modal) since this is an outward-facing action.
export function SendRemittanceButton({
  id,
  sentAt,
  variant = 'full',
}: {
  id: string
  sentAt: string | null
  variant?: 'full' | 'compact'
}) {
  const router = useRouter()
  const [localSentAt, setLocalSentAt] = useState<string | null>(sentAt)
  const [armed, setArmed] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const compact = variant === 'compact'

  if (localSentAt) {
    return (
      <span className={clsx('inline-flex items-center gap-1.5 text-emerald-700', compact ? 'text-xs' : 'text-sm')}>
        <Check size={compact ? 13 : 15} /> Sent {formatDateTime(localSentAt)}
      </span>
    )
  }

  function send() {
    setErr(null)
    startTransition(async () => {
      const res = await sendContractorRemittance(id)
      if (res.error) {
        setErr(res.error)
        setArmed(false)
        return
      }
      if (res.sentAt) {
        setLocalSentAt(res.sentAt)
        router.refresh()
      }
    })
  }

  const btnBase = compact
    ? 'inline-flex items-center gap-1.5 font-medium rounded-md text-xs px-2.5 py-1.5 transition-colors'
    : 'inline-flex items-center gap-2 font-semibold rounded-lg text-sm px-4 py-2.5 transition-colors'

  return (
    <div className={clsx('inline-flex flex-col gap-1', compact ? 'items-start' : 'items-end')}>
      {!armed ? (
        <button type="button" onClick={() => { setErr(null); setArmed(true) }}
          className={clsx(btnBase, 'bg-sage-700 text-white hover:bg-sage-800')}>
          <Mail size={compact ? 13 : 16} /> Email remittance
        </button>
      ) : (
        <div className="inline-flex items-center gap-2">
          <span className={clsx('text-sage-600', compact ? 'text-[11px]' : 'text-xs')}>Send to contractor?</span>
          <button type="button" onClick={send} disabled={pending}
            className={clsx(btnBase, 'bg-sage-700 text-white hover:bg-sage-800 disabled:opacity-50')}>
            {pending ? <Loader2 size={compact ? 13 : 16} className="animate-spin" /> : <Mail size={compact ? 13 : 16} />}
            {pending ? 'Sending…' : 'Send'}
          </button>
          <button type="button" onClick={() => setArmed(false)} disabled={pending}
            className={clsx(compact ? 'text-[11px]' : 'text-xs', 'text-sage-500 hover:text-sage-700')}>
            Cancel
          </button>
        </div>
      )}
      {err && (
        <span className={clsx('inline-flex items-start gap-1 text-red-600 max-w-[280px]', compact ? 'text-[11px]' : 'text-xs')}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {err}
        </span>
      )}
    </div>
  )
}
