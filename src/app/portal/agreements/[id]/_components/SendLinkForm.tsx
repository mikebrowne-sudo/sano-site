'use client'

import { useState, useTransition } from 'react'
import { Mail, Loader2, Check } from 'lucide-react'
import { sendAgreementLink } from '../../_actions'

export function SendLinkForm({ agreementId, defaultEmail }: { agreementId: string; defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function send() {
    setError(null)
    setSent(false)
    startTransition(async () => {
      const res = await sendAgreementLink({ agreementId, email })
      if (res.error) { setError(res.error); return }
      setSent(true)
    })
  }

  return (
    <div className="mt-3 border-t border-sage-100 pt-3">
      <p className="text-[11px] font-medium text-sage-500 mb-1.5">Or email the link directly</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSent(false) }}
          placeholder="name@email.com"
          className="flex-1 rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={isPending || !email.trim()}
          className="inline-flex items-center justify-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {isPending ? 'Sending…' : sent ? 'Sent' : 'Send by email'}
        </button>
      </div>
      {sent && <p className="inline-flex items-center gap-1 text-xs text-emerald-700 mt-1.5"><Check size={12} /> Sent to {email}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
