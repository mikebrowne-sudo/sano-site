'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCleared } from '../_actions'

export function ClearToggle({ id, cleared }: { id: string; cleared: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await setCleared(id, !cleared)
      router.refresh()
    })
  }

  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-sage-500 select-none">
      <input
        type="checkbox"
        checked={cleared}
        onChange={toggle}
        disabled={isPending}
        className="h-3.5 w-3.5 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
      />
      {cleared ? 'Cleared' : 'Clear'}
    </label>
  )
}
