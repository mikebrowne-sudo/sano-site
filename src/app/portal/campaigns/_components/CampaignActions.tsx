'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Send, MailCheck, FlaskConical } from 'lucide-react'
import { sendCampaignAction, markRespondedAction, sendTestEmailAction } from '../_actions'

/** Send one test email to yourself before the real send — verifies it arrives
 *  from the right sender, the signature looks right, and it isn't going to spam. */
export function TestSendBox({ campaignId, defaultTo }: { campaignId: string; defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo ?? '')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function sendTest() {
    setMsg(null)
    startTransition(async () => {
      const res = await sendTestEmailAction({ campaignId, to })
      setMsg(res.ok ? { ok: true, text: `Test sent to ${to} — check it arrives from the right sender (and not spam).` } : { ok: false, text: res.error || 'Failed.' })
    })
  }

  return (
    <div className="rounded-lg border border-sage-200 bg-sage-50/50 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-2">
        <FlaskConical size={13} /> Send a test first
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="your@email.com"
          className="rounded-md border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
        <button
          type="button" onClick={sendTest} disabled={isPending || !to}
          className={clsx('inline-flex items-center gap-1.5 border border-sage-300 text-sage-700 font-medium px-3 py-2 rounded-md text-sm', isPending || !to ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white')}
        >
          {isPending ? 'Sending…' : 'Send test'}
        </button>
      </div>
      <p className="text-[11px] text-sage-400 mt-2">Renders exactly as the campaign will send (as the sender you set), to a sample company. Doesn&rsquo;t touch any lead.</p>
      {msg && <p className={clsx('text-sm mt-2', msg.ok ? 'text-emerald-700' : 'text-red-600')}>{msg.text}</p>}
    </div>
  )
}

export function SendCampaignButton({
  campaignId,
  pendingCount,
}: {
  campaignId: string
  pendingCount: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await sendCampaignAction(campaignId)
      if (res?.error) {
        setError(res.error)
      } else {
        setResult(`Sent ${res.sent}, skipped ${res.skipped}, failed ${res.failed}.`)
        setConfirming(false)
        router.refresh()
      }
    })
  }

  if (pendingCount === 0 && !result) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending || pendingCount === 0}
          className={clsx(
            'inline-flex items-center gap-2 bg-sage-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors',
            isPending || pendingCount === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-sage-600'
          )}
        >
          <Send size={15} />
          Send to {pendingCount} recipient{pendingCount === 1 ? '' : 's'}
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-sage-700 font-medium">
            Really send {pendingCount} email{pendingCount === 1 ? '' : 's'} now?
          </span>
          <button
            type="button"
            onClick={send}
            disabled={isPending}
            className={clsx(
              'inline-flex items-center gap-2 bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors',
              isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-700'
            )}
          >
            {isPending ? 'Sending…' : 'Yes, send now'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="text-sm text-sage-600 hover:text-sage-800 px-2"
          >
            Cancel
          </button>
        </div>
      )}
      {result && <span className="text-sm text-green-700 font-medium">{result}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}

export function MarkRepliedButton({ recipientId }: { recipientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markRespondedAction(recipientId)
          router.refresh()
        })
      }
      className={clsx(
        'inline-flex items-center gap-1 text-[11px] font-semibold text-sage-600 hover:text-green-700 transition-colors',
        isPending && 'opacity-60'
      )}
      title="Mark that this lead replied"
    >
      <MailCheck size={12} />
      {isPending ? '…' : 'Mark replied'}
    </button>
  )
}
