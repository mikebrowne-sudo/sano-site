'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { UserPlus } from 'lucide-react'
import { assignMileageToEmployee } from '../_actions'

/** Assign an orphaned (unassigned) mileage log to an employee, so it flows into
 *  their pay run. Replaces the need for manual SQL on legacy logs. */
export function AssignMileageButton({
  id,
  employees,
}: {
  id: string
  employees: { id: string; fullName: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(employees[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function assign() {
    setError(null)
    startTransition(async () => {
      const res = await assignMileageToEmployee({ id, contractorId: choice })
      if (res?.error) setError(res.error)
      else { setOpen(false); router.refresh() }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
        title="This entry isn’t linked to anyone — assign it so it can be paid"
      >
        <UserPlus size={12} /> Assign
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <select value={choice} onChange={(e) => setChoice(e.target.value)} className="rounded-md border border-sage-300 px-1.5 py-1 text-[12px] text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500">
        {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
      </select>
      <button type="button" disabled={isPending || !choice} onClick={assign} className={clsx('text-[11px] font-semibold text-white bg-sage-700 hover:bg-sage-600 px-2 py-1 rounded', (isPending || !choice) && 'opacity-60')}>{isPending ? '…' : 'Assign'}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-sage-500 hover:text-sage-700">Cancel</button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
