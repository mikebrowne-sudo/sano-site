'use client'

import { useState, useTransition } from 'react'
import { Mail, Check } from 'lucide-react'
import { sendAccountantInvite } from '../_actions'

export function AccountantInvites({ emails }: { emails: string[] }) {
  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <InviteRow key={email} email={email} />
      ))}
    </div>
  )
}

function InviteRow({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  function send() {
    setError(null)
    startTransition(async () => {
      const r = await sendAccountantInvite(email)
      if (!r.ok) { setStatus('error'); setError(r.error ?? 'Could not send invite.'); return }
      setStatus('sent')
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-sage-100 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-sage-800"><Mail size={15} className="text-sage-400" />{email}</p>
        {status === 'sent' && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check size={13} /> Invite sent — they’ll get an email to set their password.</p>}
        {status === 'error' && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button
        onClick={send}
        disabled={isPending}
        className="shrink-0 inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-3.5 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Sending…' : status === 'sent' ? 'Resend invite' : 'Send invite'}
      </button>
    </div>
  )
}
