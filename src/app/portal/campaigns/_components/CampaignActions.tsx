'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Send, MailCheck, FlaskConical, Trash2, Ban } from 'lucide-react'
import { sendCampaignAction, markRespondedAction, markOptedOutAction, sendTestEmailAction, deleteCampaignAction, setFollowupsEnabledAction } from '../_actions'

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

/**
 * Delete a campaign (admin only — the parent gates rendering on isAdmin). Two
 * stages: click → confirm; if the campaign has real sends the action returns
 * needsForce and we ask a sterner second confirmation before force-deleting.
 * `onDeleted` lets the caller redirect (detail page) or just refresh (list).
 */
export function DeleteCampaignButton({
  campaignId,
  redirectTo,
  variant = 'row',
}: {
  campaignId: string
  /** Where to go after a successful delete (e.g. the list). Omit to just refresh. */
  redirectTo?: string
  variant?: 'row' | 'full'
}) {
  const router = useRouter()
  const [stage, setStage] = useState<'idle' | 'confirm' | 'force'>('idle')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function doDelete(force: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await deleteCampaignAction(campaignId, { force })
      if (res?.success) {
        setStage('idle')
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      } else if (res?.needsForce) {
        setStage('force')
      } else {
        setError(res?.error || 'Delete failed.')
      }
    })
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStage('confirm') }}
        className={clsx(
          'inline-flex items-center gap-1 text-sage-400 hover:text-red-600 transition-colors',
          variant === 'full' ? 'text-sm font-medium' : 'text-[11px]'
        )}
        title="Delete campaign (admin only)"
      >
        <Trash2 size={variant === 'full' ? 15 : 13} />
        {variant === 'full' && 'Delete campaign'}
      </button>
    )
  }

  const forcing = stage === 'force'
  return (
    <div
      className="inline-flex items-center gap-2 flex-wrap"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <span className={clsx('text-[11px]', forcing ? 'text-red-700 font-semibold' : 'text-sage-600')}>
        {forcing ? 'This has real sends — really delete?' : 'Delete?'}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => doDelete(forcing)}
        className={clsx('inline-flex items-center gap-1 bg-red-600 text-white font-medium px-2.5 py-1 rounded-md text-[11px]', isPending ? 'opacity-60' : 'hover:bg-red-700')}
      >
        {isPending ? 'Deleting…' : forcing ? 'Force delete' : 'Yes, delete'}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => { setStage('idle'); setError(null) }}
        className="text-[11px] text-sage-500 hover:text-sage-700"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-red-600 w-full">{error}</span>}
    </div>
  )
}

/** Per-campaign follow-up toggle. Follow-ups default OFF; the drip cron only
 *  sends them when this is on. */
export function FollowupToggle({ campaignId, enabled }: { campaignId: string; enabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    setError(null)
    startTransition(async () => {
      const res = await setFollowupsEnabledAction({ campaignId, enabled: !enabled })
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-sage-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sage-800">Automatic follow-up</p>
          <p className="text-[12px] text-sage-500 mt-0.5">
            {enabled
              ? 'ON — one follow-up ~5 business days after the intro, to delivered non-repliers only.'
              : 'OFF — no follow-ups will be sent for this campaign.'}
          </p>
        </div>
        <button
          type="button" onClick={toggle} disabled={isPending}
          className={clsx(
            'relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors',
            enabled ? 'bg-sage-600' : 'bg-gray-300', isPending && 'opacity-60',
          )}
          aria-pressed={enabled}
          aria-label="Toggle automatic follow-up"
        >
          <span className={clsx('inline-block h-5 w-5 transform rounded-full bg-white transition-transform', enabled ? 'translate-x-5' : 'translate-x-0.5')} />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
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

/** Mark a recipient as opted out → suppresses the lead from ALL future campaigns. */
export function OptOutButton({ recipientId }: { recipientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button" disabled={isPending}
        onClick={() => setConfirming(true)}
        className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold text-sage-500 hover:text-red-600 transition-colors', isPending && 'opacity-60')}
        title="Opt this lead out — suppresses them from all future campaigns"
      >
        <Ban size={12} /> Opt out
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button" disabled={isPending}
        onClick={() => startTransition(async () => { await markOptedOutAction(recipientId); router.refresh() })}
        className="text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded disabled:opacity-60"
      >
        {isPending ? '…' : 'Confirm opt-out'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-sage-500 hover:text-sage-700">Cancel</button>
    </span>
  )
}
