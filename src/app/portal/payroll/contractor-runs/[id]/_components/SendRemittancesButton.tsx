'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { sendRemittances } from '../_actions-remittance'

export function SendRemittancesButton({ payRunId }: { payRunId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function send() {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const res = await sendRemittances(payRunId)
      if ('error' in res && res.error) {
        setErr(res.error)
        return
      }
      if ('ok' in res) {
        const failed = res.errors?.length ?? 0
        const parts = [`Sent ${res.sent}`]
        if (res.skipped) parts.push(`${res.skipped} skipped (no email)`)
        if (failed) parts.push(`${failed} failed`)
        setMsg(parts.join(' · '))
        router.refresh()
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={send}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        <Send size={16} />
        {isPending ? 'Sending…' : 'Send remittances'}
      </button>
      {msg && <span className="text-[11px] text-sage-600">{msg}</span>}
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  )
}
