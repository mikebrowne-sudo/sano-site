import clsx from 'clsx'
import type { SectionState } from '@/lib/contractor-setup-status'

const TONE: Record<SectionState, string> = {
  not_requested: 'bg-gray-100 text-gray-500',
  not_applicable: 'bg-gray-100 text-gray-400',
  confirmed_by_sano: 'bg-sky-50 text-sky-700',
  contractor_to_confirm: 'bg-amber-50 text-amber-700',
  contractor_to_complete: 'bg-amber-50 text-amber-700',
  awaiting_contractor: 'bg-amber-50 text-amber-700',
  awaiting_sano_review: 'bg-violet-50 text-violet-700',
  blocked_pending_workflow: 'bg-red-50 text-red-700',
  verified: 'bg-emerald-50 text-emerald-700',
}

const LABEL: Record<SectionState, string> = {
  not_requested: 'Not requested yet',
  not_applicable: 'Not applicable',
  confirmed_by_sano: 'Confirmed by Sano',
  contractor_to_confirm: 'Contractor to confirm',
  contractor_to_complete: 'Contractor to complete',
  awaiting_contractor: 'Awaiting contractor',
  awaiting_sano_review: 'Awaiting Sano review',
  blocked_pending_workflow: 'Blocked — later workflow',
  verified: 'Verified',
}

export function SectionStatusBadge({ state }: { state: SectionState }) {
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', TONE[state])}>
      {LABEL[state]}
    </span>
  )
}
