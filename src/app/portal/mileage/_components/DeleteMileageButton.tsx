'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteMileageLog } from '../_actions'

export function DeleteMileageButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function del() {
    if (!confirm('Delete this mileage log?')) return
    startTransition(async () => {
      await deleteMileageLog(id)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={isPending}
      className="text-sage-300 hover:text-red-600 transition-colors disabled:opacity-50"
      aria-label="Delete log"
    >
      <Trash2 size={15} />
    </button>
  )
}
