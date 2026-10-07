'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { AlertTriangle, Check, X, Pencil } from 'lucide-react'
import {
  fixLeadCompanyNameAction,
  approveRecipientNameAction,
  excludeRecipientAction,
  type FlaggedRecipient,
} from '../_actions'

/**
 * Pre-launch company-name review. Lists every PENDING recipient whose company
 * name is flagged as unsafe to interpolate, and lets the operator fix the name,
 * exclude the recipient, or explicitly approve it. Launch is blocked while any
 * unapproved flagged name remains (enforced server-side in sendCampaignAction).
 */
export function NameReviewPanel({
  campaignId,
  flagged,
  blocking,
}: {
  campaignId: string
  flagged: FlaggedRecipient[]
  blocking: number
}) {
  if (flagged.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
          <Check size={15} /> Email business names all clean
        </p>
        <p className="text-[12px] text-emerald-700 mt-1">
          Every recipient has a clean email business name for the subject and body.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
        <AlertTriangle size={15} />
        {blocking > 0
          ? `${blocking} email business name${blocking === 1 ? '' : 's'} need${blocking === 1 ? 's' : ''} attention before launch`
          : 'All flagged names approved — ready to launch'}
      </p>
      <p className="text-[12px] text-amber-800 mt-1 mb-3">
        The <strong>email business name</strong> is what gets inserted into the subject and body
        (the CRM company name is never changed). Fix, exclude, or approve each one.
        {blocking > 0 && ' Sending is blocked until none remain unresolved.'}
      </p>
      <ul className="space-y-2">
        {flagged.map((f) => (
          <NameRow key={f.recipientId} campaignId={campaignId} f={f} />
        ))}
      </ul>
    </div>
  )
}

function NameRow({ campaignId, f }: { campaignId: string; f: FlaggedRecipient }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  // Edit the email business name; seed from the existing one, else the CRM name.
  const [value, setValue] = useState(f.emailBusinessName ?? f.company ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) setError(res.error)
      else { setEditing(false); router.refresh() }
    })
  }

  return (
    <li className={clsx('rounded-lg border bg-white p-3', f.approved ? 'border-emerald-200' : 'border-amber-200')}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-sage-400">CRM: {f.company || '(blank)'}</span>
                <div className="flex items-center gap-2">
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="rounded-md border border-sage-300 px-2.5 py-1.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-72 max-w-full"
                    placeholder="Email business name (used in the email)"
                  />
                  <button
                    type="button" disabled={isPending || !value.trim()}
                    onClick={() => run(() => fixLeadCompanyNameAction({ leadId: f.leadId, campaignId, company: value }))}
                    className="text-[12px] font-semibold text-white bg-sage-700 hover:bg-sage-600 px-2.5 py-1.5 rounded-md disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setValue(f.emailBusinessName ?? f.company ?? '') }} className="text-[12px] text-sage-500 hover:text-sage-700">Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wide text-sage-400">CRM: {f.company || '(blank)'}</p>
              <p className="text-sm font-medium text-sage-800 truncate max-w-[420px]">
                <span className="text-sage-400 font-normal">Email name: </span>
                {f.emailBusinessName || <span className="italic text-amber-700">(blank)</span>}
                {f.approved && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">approved</span>}
              </p>
              <ul className="mt-1 text-[11px] text-amber-800 list-disc pl-4">
                {f.issues.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-2 flex-none">
            <button
              type="button" disabled={isPending}
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-sage-700 hover:text-sage-900"
            >
              <Pencil size={12} /> Fix
            </button>
            <button
              type="button" disabled={isPending}
              onClick={() => run(() => excludeRecipientAction({ recipientId: f.recipientId, campaignId }))}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-red-600 hover:text-red-700"
            >
              <X size={12} /> Exclude
            </button>
            {!f.approved && (
              <button
                type="button" disabled={isPending}
                onClick={() => run(() => approveRecipientNameAction({ recipientId: f.recipientId, campaignId }))}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Check size={12} /> Approve
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
    </li>
  )
}
