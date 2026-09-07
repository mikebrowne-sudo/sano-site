// Approved mileage that no pay run has picked up.
//
// Mileage is captured when a run is CREATED, not when it's approved. Approve a
// log after its run already exists and the run's frozen figures show $0.00
// mileage — the log just sits there, invisible, until someone notices the
// contractor was underpaid.
//
// That has now happened twice to the same employee. The cost is real: a run is
// approved, the money goes out, and the mileage silently rolls on.
//
// These helpers surface the gap where the decision is actually made — on the
// pay run page, before approving, and on the payroll index.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface UnattachedMileageEntry {
  id: string
  contractorId: string
  contractorName: string | null
  logDate: string
  distanceKm: number | null
  amount: number
  /** Approved mileage flows into a run; draft mileage is skipped entirely. */
  status: 'approved' | 'draft'
}

export interface UnattachedMileageSummary {
  entries: UnattachedMileageEntry[]
  /** Approved + unattached — money owed that no run is paying. */
  approvedTotal: number
  /** Draft + unattached — invisible to every run until someone approves it. */
  draftTotal: number
  approvedCount: number
  draftCount: number
  /** Per-contractor approved totals, for a per-line warning on a run. */
  approvedByContractor: Record<string, number>
}

const EMPTY: UnattachedMileageSummary = {
  entries: [], approvedTotal: 0, draftTotal: 0,
  approvedCount: 0, draftCount: 0, approvedByContractor: {},
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Load mileage that no pay run has consumed (`pay_run_id is null`).
 *
 * Both approved AND draft are returned: draft is the more dangerous state,
 * because a run silently skips it, so the operator needs to see it BEFORE
 * approving rather than a week later.
 *
 * `contractorIds` narrows to the people on a given run; omit it for the
 * whole-workforce view.
 */
export async function loadUnattachedMileage(
  supabase: SupabaseClient,
  opts: { contractorIds?: string[]; upToDate?: string } = {},
): Promise<UnattachedMileageSummary> {
  let query = supabase
    .from('mileage_logs')
    .select('id, contractor_id, log_date, distance_km, reimbursement_amount, status, contractors ( full_name, preferred_name )')
    .is('pay_run_id', null)
    .in('status', ['approved', 'draft'])
    .order('log_date')

  if (opts.contractorIds && opts.contractorIds.length > 0) {
    query = query.in('contractor_id', opts.contractorIds)
  }
  if (opts.upToDate) {
    query = query.lte('log_date', opts.upToDate)
  }

  const { data, error } = await query
  if (error || !data) return EMPTY

  const entries: UnattachedMileageEntry[] = []
  const approvedByContractor: Record<string, number> = {}
  let approvedTotal = 0
  let draftTotal = 0
  let approvedCount = 0
  let draftCount = 0

  for (const row of data) {
    const person = row.contractors as unknown as
      { full_name: string | null; preferred_name: string | null } | null
    const amount = Number(row.reimbursement_amount ?? 0)
    const status = (row.status as string) === 'approved' ? 'approved' : 'draft'
    const contractorId = row.contractor_id as string

    entries.push({
      id: row.id as string,
      contractorId,
      contractorName: person?.preferred_name || person?.full_name || null,
      logDate: row.log_date as string,
      distanceKm: (row.distance_km as number | null) ?? null,
      amount,
      status,
    })

    if (status === 'approved') {
      approvedTotal += amount
      approvedCount += 1
      approvedByContractor[contractorId] = round2((approvedByContractor[contractorId] ?? 0) + amount)
    } else {
      draftTotal += amount
      draftCount += 1
    }
  }

  return {
    entries,
    approvedTotal: round2(approvedTotal),
    draftTotal: round2(draftTotal),
    approvedCount,
    draftCount,
    approvedByContractor,
  }
}

/** Is there anything worth warning about? */
export function hasUnattachedMileage(s: UnattachedMileageSummary): boolean {
  return s.approvedCount > 0 || s.draftCount > 0
}

/**
 * Operator-facing summary line.
 *
 * Deliberately states the CONSEQUENCE ("won't be included") rather than just a
 * total — the failure mode here is an operator seeing a number and assuming the
 * run already handles it.
 */
export function describeUnattachedMileage(s: UnattachedMileageSummary): string | null {
  if (!hasUnattachedMileage(s)) return null
  const bits: string[] = []
  if (s.approvedCount > 0) {
    bits.push(`$${s.approvedTotal.toFixed(2)} approved (${s.approvedCount} ${s.approvedCount === 1 ? 'trip' : 'trips'})`)
  }
  if (s.draftCount > 0) {
    bits.push(`$${s.draftTotal.toFixed(2)} still unapproved (${s.draftCount} ${s.draftCount === 1 ? 'trip' : 'trips'})`)
  }
  return `${bits.join(' and ')} is not attached to any pay run and won't be included in this one.`
}
