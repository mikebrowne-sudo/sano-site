// Why the job-roster read must use the SERVICE client once job_workers RLS is
// tightened to NOT is_contractor().
//
// The roster query is the one read in contractor-job-detail-data.ts that is NOT
// the caller's own row. Under a self-read-only policy it collapses from N rows
// to 1 — and rosterIds.length is the DIVISOR for the hours fallback. Every
// cleaner on a shared job would then be shown the WHOLE job's hours and pay
// instead of their share.
//
// It fails silently: no error, no empty state, just a bigger number. That makes
// it more dangerous than a crash, which is why it is pinned here.
//
// Three live jobs are on the fallback path (hours_allocated null, >1 worker).

import { resolveWorkerHours } from '@/lib/job-hours-split'

const ALLOWED = 8
/** The fallback path: no per-worker hours recorded, so the roster size decides. */
const OWN_HOURS_NOT_SET = null

describe('the hours fallback depends on seeing the whole roster', () => {

  it('splits an 8h two-cleaner job into a 4h share', () => {
    expect(resolveWorkerHours(OWN_HOURS_NOT_SET, ALLOWED, 2)).toBe(4)
  })

  it('a collapsed roster shows the cleaner the WHOLE job — the bug', () => {
    // What a self-read-only policy would produce: rosterIds.length === 1.
    expect(resolveWorkerHours(OWN_HOURS_NOT_SET, ALLOWED, 1)).toBe(8)
  })

  it('the difference is a doubling, not a rounding error', () => {
    const correct = resolveWorkerHours(OWN_HOURS_NOT_SET, ALLOWED, 2)!
    const collapsed = resolveWorkerHours(OWN_HOURS_NOT_SET, ALLOWED, 1)!
    expect(collapsed).toBe(correct * 2)
  })

  it('a three-cleaner job would be shown at 3x', () => {
    const correct = resolveWorkerHours(OWN_HOURS_NOT_SET, 9, 3)!
    const collapsed = resolveWorkerHours(OWN_HOURS_NOT_SET, 9, 1)!
    expect(correct).toBe(3)
    expect(collapsed).toBe(9)
  })
})

describe('a worker with their own hours recorded is unaffected', () => {
  it('uses the stored hours and never consults the roster size', () => {
    // Most jobs are here — hours_allocated is set at assignment. Only the
    // fallback path depends on the roster, which is why this went unnoticed.
    expect(resolveWorkerHours(3.5, 8, 1)).toBe(3.5)
    expect(resolveWorkerHours(3.5, 8, 2)).toBe(3.5)
  })

  it('zero recorded hours is still a real answer, not a missing one', () => {
    expect(resolveWorkerHours(0, 8, 2)).toBe(0)
  })
})

describe('single-worker jobs are genuinely unaffected', () => {
  it('one cleaner on an 8h job sees 8h either way', () => {
    expect(resolveWorkerHours(OWN_HOURS_NOT_SET, 8, 1)).toBe(8)
  })
})
