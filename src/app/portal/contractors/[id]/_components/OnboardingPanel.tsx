// Phase 5.3 + 5.4 — Onboarding panel for the contractor detail page.
//
// Server component: fetches contractor_onboarding rows, settings, and
// the contractor row. Computes progress over REQUIRED items only
// (per onboarding_settings); optional items still render but are
// marked "Optional" and not counted toward completion. When the
// required checklist hits 100%, the panel surfaces a "Ready for
// activation" banner + the MarkActiveButton (which itself enforces
// the trial gate).

import { createClient } from '@/lib/supabase-server'
import clsx from 'clsx'
import { OnboardingChecklistItem } from './OnboardingChecklistItem'
import { ONBOARDING_SECTIONS, isStaffVerifyItem, isWorkflowOwnedItem } from '@/lib/onboarding-checklist'
import { SeedChecklistButton } from './SeedChecklistButton'
import { MarkActiveButton } from './MarkActiveButton'
import {
  loadWorkforceSettings,
  requiredItemsForWorkerType,
} from '@/lib/workforce-settings'

type ItemRow = {
  id: string
  section: string
  item_key: string
  label: string
  status: 'pending' | 'complete'
  sort_order: number
  completed_at: string | null
  completion_source: string | null
  effective_date: string | null
  confirmed_by: string | null
  evidence_ref: string | null
  override_reason: string | null
}

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

const STAGE_LABEL: Record<string, string> = {
  not_started:        'Not started',
  in_progress:        'In progress',
  complete:           'Complete',
}

const STAGE_BADGE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-50 text-amber-700',
  complete:    'bg-emerald-100 text-emerald-800',
}

export async function OnboardingPanel({
  contractorId,
  workerType,
  contractorStatus,
  onboardingStatus,
  trialRequired,
  trialStatus,
  grandfathered = false,
  isAdmin = false,
}: {
  contractorId: string
  workerType: 'contractor' | 'employee'
  contractorStatus: string
  onboardingStatus: string | null
  trialRequired: boolean
  trialStatus: string
  grandfathered?: boolean
  isAdmin?: boolean
}) {
  const supabase = createClient()
  const [{ data: rowsData }, settings] = await Promise.all([
    supabase
      .from('contractor_onboarding')
      .select('id, section, item_key, label, status, sort_order, completed_at, completion_source, effective_date, confirmed_by, evidence_ref, override_reason')
      .eq('contractor_id', contractorId)
      .order('sort_order', { ascending: true }),
    loadWorkforceSettings(supabase),
  ])
  const rows = (rowsData ?? []) as ItemRow[]
  const requiredKeys = new Set(requiredItemsForWorkerType(settings, workerType))

  const requiredRows = rows.filter((r) => requiredKeys.has(r.item_key))
  const requiredComplete = requiredRows.filter((r) => r.status === 'complete').length
  const requiredTotal = requiredRows.length
  const pct = requiredTotal > 0 ? Math.round((requiredComplete / requiredTotal) * 100) : 0
  const allRequiredComplete = requiredTotal > 0 && requiredComplete === requiredTotal

  const bySection: Record<string, ItemRow[]> = {}
  for (const sec of ONBOARDING_SECTIONS) bySection[sec] = []
  for (const r of rows) {
    if (!bySection[r.section]) bySection[r.section] = []
    bySection[r.section].push(r)
  }

  const stage = onboardingStatus ?? 'not_started'

  // Display "Ready for activation" when required checklist is complete
  // AND the contractor isn't yet active — i.e. waiting on the admin
  // approval click (or the trial gate).
  const readyForActivation = allRequiredComplete && contractorStatus !== 'active'

  // What's blocking activation? Surface the reason inline so admin
  // knows to resolve the trial outcome before clicking.
  const trialOk = !trialRequired || trialStatus === 'passed'
  const activationBlockedReason = !allRequiredComplete
    ? 'Complete every required checklist item first.'
    : !trialOk
      ? 'Trial has not been marked passed yet — record the trial outcome first.'
      : null

  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-sage-800">Onboarding</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {readyForActivation && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              Ready for activation
            </span>
          )}
          <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', STAGE_BADGE[stage] ?? 'bg-gray-100 text-gray-600')}>
            {STAGE_LABEL[stage] ?? stage}
          </span>
        </div>
      </div>

      {grandfathered && (
        <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
          <span className="font-semibold">Legacy transition record.</span> Approved to operate under the previous requirements — historical items are shown below for later review and do not block this contractor.
        </div>
      )}

      {rows.length === 0 ? (
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
              <p className="text-xs font-medium text-sage-600">
                {requiredComplete} of {requiredTotal} required complete
              </p>
              <p className="text-xs text-sage-500">{pct}%</p>
            </div>
            <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full transition-all duration-300',
                  allRequiredComplete ? 'bg-emerald-500' : 'bg-sage-500',
                )}
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
                        itemKey={it.item_key}
                        label={it.label}
                        required={requiredKeys.has(it.item_key)}
                        complete={it.status === 'complete'}
                        completedDateLabel={fmtRelative(it.completed_at)}
                        source={it.completion_source}
                        effectiveDate={it.effective_date}
                        confirmedBy={it.confirmed_by}
                        evidenceRef={it.evidence_ref}
                        overrideReason={it.override_reason}
                        isStaffVerify={isStaffVerifyItem(it.item_key)}
                        isWorkflowOwned={isWorkflowOwnedItem(it.item_key)}
                        isAdmin={isAdmin}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {readyForActivation && (
            <div className="mt-6 pt-5 border-t border-sage-100">
              <p className="text-sm font-medium text-sage-800 mb-1">Ready for activation</p>
              <p className="text-xs text-sage-600 mb-3">
                Required checklist complete. Activating will set status to <span className="font-mono">active</span> and unlock job assignment.
              </p>
              <MarkActiveButton
                contractorId={contractorId}
                blockedReason={activationBlockedReason}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
