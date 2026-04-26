// Phase 5.3 — Onboarding panel for the contractor detail page.
//
// Server component: fetches contractor_onboarding rows, computes
// progress, groups by section, then renders client-side checklist
// items. Status auto-updates via setOnboardingItemStatus inside the
// item component.

import { createClient } from '@/lib/supabase-server'
import clsx from 'clsx'
import { OnboardingChecklistItem } from './OnboardingChecklistItem'
import { ONBOARDING_SECTIONS } from '@/lib/onboarding-checklist'
import { SeedChecklistButton } from './SeedChecklistButton'

type ItemRow = {
  id: string
  section: string
  item_key: string
  label: string
  status: 'pending' | 'complete'
  sort_order: number
  completed_at: string | null
}

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

const STAGE_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete:    'Complete',
}

const STAGE_BADGE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-50 text-amber-700',
  complete:    'bg-emerald-100 text-emerald-800',
}

export async function OnboardingPanel({
  contractorId,
  onboardingStatus,
}: {
  contractorId: string
  onboardingStatus: string | null
}) {
  const supabase = createClient()
  const { data: rowsData } = await supabase
    .from('contractor_onboarding')
    .select('id, section, item_key, label, status, sort_order, completed_at')
    .eq('contractor_id', contractorId)
    .order('sort_order', { ascending: true })
  const rows = (rowsData ?? []) as ItemRow[]

  const total = rows.length
  const complete = rows.filter((r) => r.status === 'complete').length
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0

  // Group by section, preserving template order.
  const bySection: Record<string, ItemRow[]> = {}
  for (const sec of ONBOARDING_SECTIONS) bySection[sec] = []
  for (const r of rows) {
    if (!bySection[r.section]) bySection[r.section] = []
    bySection[r.section].push(r)
  }

  const stage = onboardingStatus ?? 'not_started'

  return (
    <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-sage-800">Onboarding</h2>
        <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STAGE_BADGE[stage] ?? 'bg-gray-100 text-gray-600')}>
          {STAGE_LABEL[stage] ?? stage}
        </span>
      </div>

      {total === 0 ? (
        <div>
          <p className="text-sm text-sage-600 mb-3">
            No onboarding checklist for this contractor yet. Seed the default checklist for their worker type to get started.
          </p>
          <SeedChecklistButton contractorId={contractorId} />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-sage-600">{complete} of {total} complete</p>
              <p className="text-xs text-sage-500">{pct}%</p>
            </div>
            <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-5">
            {ONBOARDING_SECTIONS.filter((s) => (bySection[s] ?? []).length > 0).map((section) => (
              <div key={section}>
                <p className="text-xs uppercase tracking-wide font-semibold text-sage-700 mb-2">{section}</p>
                <ul className="space-y-1.5">
                  {(bySection[section] ?? []).map((it) => (
                    <li key={it.id}>
                      <OnboardingChecklistItem
                        itemId={it.id}
                        contractorId={contractorId}
                        label={it.label}
                        complete={it.status === 'complete'}
                        completedAt={it.completed_at}
                        completedDateLabel={fmtRelative(it.completed_at)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
