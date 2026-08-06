'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { previewRecipientAction } from '../_actions'

type Preview = Awaited<ReturnType<typeof previewRecipientAction>>

/**
 * Clickable lead name that expands to show EXACTLY what will be sent to this
 * recipient — subject (email business name interpolated), variant (named/team),
 * plain-text body, and a warning if it's currently blocked from sending.
 */
export function RecipientPreview({
  recipientId,
  company,
  email,
}: {
  recipientId: string
  company: string
  email: string | null
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (!preview) {
      startTransition(async () => {
        const res = await previewRecipientAction(recipientId)
        setPreview(res)
      })
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 font-medium text-sage-800 hover:underline text-left"
      >
        {open ? <ChevronDown size={13} className="text-sage-400" /> : <ChevronRight size={13} className="text-sage-400" />}
        {company}
      </button>
      <p className="text-[11px] text-sage-400 mt-0.5 pl-4">{email}</p>

      {open && (
        <div className="mt-2 ml-4 rounded-lg border border-sage-200 bg-sage-50/50 p-3 text-[13px]">
          {isPending && <p className="text-sage-500">Rendering preview…</p>}
          {preview?.error && <p className="text-red-600">{preview.error}</p>}
          {preview && !preview.error && (
            <div className="space-y-2">
              {preview.blocked && (
                <div className="flex items-start gap-1.5 text-[12px] text-amber-800 bg-amber-100 border border-amber-200 rounded-md px-2.5 py-1.5">
                  <AlertTriangle size={13} className="mt-0.5 flex-none" />
                  <span><strong>Blocked from sending:</strong> {preview.blockReason} Fix it in the review panel above.</span>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-sage-500">
                <span>Variant: <strong className="text-sage-700">{preview.variant === 'named' ? 'Named (Hi first-name)' : 'Team (Hi team)'}</strong></span>
                <span>Email name: <strong className="text-sage-700">{preview.emailBusinessName || '(blank)'}</strong></span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide text-sage-400">Subject</span>
                <p className="font-medium text-sage-800">{preview.subject}</p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide text-sage-400">Body</span>
                <pre className={clsx('mt-1 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-sage-700 bg-white border border-sage-100 rounded-md p-3')}>
                  {preview.text}
                </pre>
                <p className="text-[10px] text-sage-400 mt-1">Plain-text shown; the email also sends Carol’s banner signature.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
