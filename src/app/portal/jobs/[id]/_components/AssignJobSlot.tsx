// Phase 3 perf — Suspense slot that defers the active-contractor
// roster fetch until after the rest of the job detail page has
// rendered. Same `AssignJobButton` is mounted; it just hydrates a
// moment later than the page header. Falls back to a disabled-looking
// placeholder so the header layout stays stable.

import { Suspense } from 'react'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { AssignJobButton, type AssignJobButtonProps } from './AssignJobButton'

type SlotProps = Omit<AssignJobButtonProps, 'contractors'>

async function ContractorRosterButton(props: SlotProps) {
  const supabase = createClient()
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name')

  return <AssignJobButton {...props} contractors={contractors ?? []} />
}

function Placeholder() {
  return (
    <button
      type="button"
      disabled
      aria-busy="true"
      className="inline-flex items-center gap-2 bg-sage-100 text-sage-500 font-medium px-4 py-2.5 rounded-lg text-sm cursor-wait"
    >
      <UserPlus size={14} />
      Assign
    </button>
  )
}

export function AssignJobSlot(props: SlotProps) {
  return (
    <Suspense fallback={<Placeholder />}>
      <ContractorRosterButton {...props} />
    </Suspense>
  )
}
