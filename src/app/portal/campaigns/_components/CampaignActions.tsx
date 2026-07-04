'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Send, MailCheck } from 'lucide-react'
import { sendCampaignAction, markRespondedAction } from '../_actions'

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
