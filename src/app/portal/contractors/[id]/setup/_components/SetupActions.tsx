'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Check, UserPlus } from 'lucide-react'
import { createContractorSetup, sendSetupLink, acceptProposedChange } from '../_actions'

export function CreateSetupButton({ contractorId }: { contractorId: string }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  return (
    <div>
      <button type="button" disabled={isPending} onClick={() => startTransition(async () => {
        const res = await createContractorSetup(contractorId)
        if (res.error) { setErr(res.error); return }
        router.refresh()
      })} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        <UserPlus size={16} /> {isPending ? 'Creating…' : 'Start contractor setup'}
      </button>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

export function SendLinkButton({ contractorId, sentAt }: { contractorId: string; sentAt: string | null }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  return (
    <div>
      <button type="button" disabled={isPending} onClick={() => startTransition(async () => {
        const res = await sendSetupLink(contractorId)
        if (res.error) { setErr(res.error); return }
        router.refresh()
      })} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50">
        <Send size={15} /> {isPending ? 'Sending…' : sentAt ? 'Resend secure link' : 'Send secure link to contractor'}
      </button>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

export function ProposedChanges({ contractorId, changes }: { contractorId: string; changes: Record<string, { old: unknown; new: unknown }> }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const entries = Object.entries(changes ?? {})
  if (entries.length === 0) return <p className="text-sm text-sage-400">No changes proposed by the contractor.</p>

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-sage-500">Critical changes require your acceptance — they do not overwrite the record automatically.</p>
      {entries.map(([field, ch]) => (
        <div key={field} className="flex items-center justify-between gap-3 border border-sage-100 rounded-lg px-3 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-medium text-sage-800">{field.replace(/_/g, ' ')}</span>
            <div className="text-xs text-sage-500 truncate">
              <span className="line-through">{String(ch.old ?? '—')}</span> → <span className="text-sage-800">{String(ch.new ?? '—')}</span>
            </div>
          </div>
          <button type="button" disabled={isPending} onClick={() => startTransition(async () => {
            const res = await acceptProposedChange(contractorId, field)
            if (res.error) { setErr(res.error); return }
            router.refresh()
          })} className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium text-xs shrink-0">
            <Check size={13} /> Accept
          </button>
        </div>
      ))}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
