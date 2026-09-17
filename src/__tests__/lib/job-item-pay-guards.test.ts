// The three guard changes in approveContractorPay, pinned as pure logic.
//
// These protect money. Each change is narrowly scoped to an ITEM payable and
// leaves the JOB payable behaving exactly as it did:
//
//   duplicate   job: one per (job, contractor)  |  item: at most one per item
//   roster row  job: required                   |  item: not required
//   retainer    job: blocks                     |  item: exempt
//
// The subtle one is the duplicate query: without the `job_item_id IS NULL`
// branch, approving an extra would make the job itself look already-paid (and
// vice versa), which would silently stop a real cleaner being paid.

import { jobItemPayable } from '@/lib/job-items'
import { isPayablePerOccurrence } from '@/lib/job-worker-pay-basis'

/** Mirrors the duplicate-guard branch in _actions-approve-pay.ts. */
function isDuplicate(
  existing: { job_item_id: string | null; status: string }[],
  itemId: string | null,
): boolean {
  const live = existing.filter((r) => r.status !== 'void')
  return itemId
    ? live.some((r) => r.job_item_id === itemId)
    : live.some((r) => r.job_item_id === null)
}

/** Mirrors the roster gate: `if (!jw && !item) return error`. */
function rosterSatisfied(hasWorkerRow: boolean, isItem: boolean): boolean {
  return hasWorkerRow || isItem
}

/** Mirrors the retainer gate: `if (!item && jw && !isPayablePerOccurrence(...))`. */
function retainerBlocks(payType: string | null, isItem: boolean): boolean {
  return !isItem && !isPayablePerOccurrence(payType)
}

describe('duplicate guard', () => {
  const JOB_PAYABLE = { job_item_id: null, status: 'approved' }
  const ITEM_A = { job_item_id: 'item-a', status: 'approved' }

  it('still refuses a second payable for the job itself', () => {
    expect(isDuplicate([JOB_PAYABLE], null)).toBe(true)
  })

  it('still refuses a second payable for the same extra', () => {
    expect(isDuplicate([ITEM_A], 'item-a')).toBe(true)
  })

  it('an approved EXTRA does not make the job look already paid', () => {
    // The regression this branch exists to prevent: Priya must still get paid
    // for the clean after Dave is paid for the carpet.
    expect(isDuplicate([ITEM_A], null)).toBe(false)
  })

  it('an approved JOB does not make an extra look already paid', () => {
    expect(isDuplicate([JOB_PAYABLE], 'item-a')).toBe(false)
  })

  it('two different extras on one job are both payable', () => {
    expect(isDuplicate([ITEM_A], 'item-b')).toBe(false)
  })

  it('a voided payable never blocks a re-approval', () => {
    expect(isDuplicate([{ job_item_id: 'item-a', status: 'void' }], 'item-a')).toBe(false)
    expect(isDuplicate([{ job_item_id: null, status: 'void' }], null)).toBe(false)
  })
})

describe('roster gate', () => {
  it('the job payable still requires a job_workers row', () => {
    expect(rosterSatisfied(false, false)).toBe(false)
    expect(rosterSatisfied(true, false)).toBe(true)
  })

  it('an extra is payable to someone who was never on the roster', () => {
    // The carpet specialist. Adding them to job_workers instead would drag them
    // into resplitJobHours and cut the actual cleaner's hours.
    expect(rosterSatisfied(false, true)).toBe(true)
  })

  it('an extra by someone who IS on the roster is fine too', () => {
    expect(rosterSatisfied(true, true)).toBe(true)
  })
})

describe('retainer gate', () => {
  it('still blocks paying the occurrence to a retained contractor', () => {
    expect(retainerBlocks('fixed', false)).toBe(true)
  })

  it('exempts an extra — genuinely additional work, not the occurrence', () => {
    expect(retainerBlocks('fixed', true)).toBe(false)
  })

  it('never blocks hourly or per-visit workers either way', () => {
    expect(retainerBlocks('hourly', false)).toBe(false)
    expect(retainerBlocks('per_visit', false)).toBe(false)
    expect(retainerBlocks(null, false)).toBe(false)
  })
})

describe('an extra is priced by the item, never by the job_workers row', () => {
  it('pays the set amount regardless of the clean’s hourly rate', () => {
    // Dave's carpet clean is $180. Priya's $32.20/hr on the same job is
    // irrelevant to it.
    const item = { contractor_id: 'dave', cost_amount: 180, cost_basis: 'fixed' }
    expect(jobItemPayable(item)).toEqual({ amount: 180, basis: 'fixed', hours: null })
  })

  it('an hourly extra reports its own hours, not the job’s', () => {
    const item = { contractor_id: 'dave', cost_amount: 150, cost_basis: 'hourly', cost_hours: 3 }
    expect(jobItemPayable(item)).toEqual({ amount: 150, basis: 'hourly', hours: 3 })
  })

  it('refuses rather than paying zero when the extra is not set up', () => {
    expect(jobItemPayable({ contractor_id: 'dave', cost_amount: null })).toHaveProperty('error')
    expect(jobItemPayable({ contractor_id: null, cost_amount: 180 })).toHaveProperty('error')
  })
})

describe('the full two-payable scenario', () => {
  it('a job and an extra on it both pay, independently', () => {
    const raised: { job_item_id: string | null; status: string }[] = []

    // 1. Priya, the assigned cleaner, for the clean.
    expect(isDuplicate(raised, null)).toBe(false)
    expect(rosterSatisfied(true, false)).toBe(true)
    raised.push({ job_item_id: null, status: 'approved' })

    // 2. Dave, not on the roster, for the carpet.
    expect(isDuplicate(raised, 'carpet')).toBe(false)
    expect(rosterSatisfied(false, true)).toBe(true)
    raised.push({ job_item_id: 'carpet', status: 'approved' })

    // 3. Neither can be raised twice.
    expect(isDuplicate(raised, null)).toBe(true)
    expect(isDuplicate(raised, 'carpet')).toBe(true)
    expect(raised).toHaveLength(2)
  })
})

describe('the in-house answer is remembered', () => {
  // The "Needs contractor" prompt must stop once the operator has answered it.
  // A badge that nags forever trains staff to ignore it, which defeats its
  // purpose for the extras that genuinely ARE unfinished.
  function needsContractor(item: {
    contractor_id: string | null
    in_house?: boolean | null
    payable_number?: string | null
  }): boolean {
    return !item.contractor_id && !item.payable_number && !item.in_house
  }

  it('prompts on an extra nobody has been set on yet', () => {
    expect(needsContractor({ contractor_id: null })).toBe(true)
  })

  it('stops prompting once the operator confirms it is in-house', () => {
    expect(needsContractor({ contractor_id: null, in_house: true })).toBe(false)
  })

  it('does not prompt once a contractor is set', () => {
    expect(needsContractor({ contractor_id: 'dave' })).toBe(false)
  })

  it('treats a pre-migration row (in_house undefined) as unanswered', () => {
    expect(needsContractor({ contractor_id: null, in_house: undefined })).toBe(true)
  })
})
