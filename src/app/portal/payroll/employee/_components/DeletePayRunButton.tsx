'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteEmployeePayRun } from '../_actions'

export function DeletePayRunButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => { if (confirm('Delete this pay run? (The wages expense it created is left in place.)')) startTransition(async () => { await deleteEmployeePayRun(id); router.refresh() }) }}
      disabled={isPending}
      className="text-sage-300 hover:text-red-600 transition-colors disabled:opacity-50"
      aria-label="Delete pay run"
    >
      <Trash2 size={15} />
    </button>
  )
}
