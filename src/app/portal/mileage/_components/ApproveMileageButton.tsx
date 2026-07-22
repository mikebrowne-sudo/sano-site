'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { approveMileageLog } from '../_actions'

export function ApproveMileageButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      onClick={() => start(async () => { await approveMileageLog(id); router.refresh() })}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 text-emerald-800 font-medium px-2.5 py-1.5 text-xs hover:bg-emerald-50 disabled:opacity-50"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
    </button>
  )
}
