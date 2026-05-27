// Phase G.2 step 2 — tests for the finance "Jobs needing attention"
// data shaper. Covers severity ordering, one-row-per-job, the row
// cap, the count-of-remaining-flags hint, and predictable
// tie-breaking inside a severity bucket.

import {
  buildFinanceAttentionRows,
  type FinanceAttentionInput,
  type FinanceAttentionJob,
} from '@/lib/finance-attention-data'

const FIXED_NOW = new Date('2026-05-27T12:00:00Z')
const ISO = (daysAgo: number) =>
  new Date(FIXED_NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

function makeJob(partial: Partial<FinanceAttentionJob> = {}): FinanceAttentionJob {
  // Spread `partial` at the end so explicit `null` overrides (e.g.
  // `client_id: null` to trigger flagNoClient) are preserved — using
  // `??` per-field would silently fall back to the default.
  return {
    id: 'job-1',
    job_number: 'J-0001',
    client_id: 'client-1',
    job_price: 500,
    allowed_hours: 4,
    description: 'Test scope',
    scope_snapshot: null,
    status: 'completed',
    invoice_id: null,
    completed_at: ISO(2),
    clients: { name: 'Test Client' },
    job_workers: [
      {
        contractor_id: 'c-1',
        pay_rate: 50,
        approved_hours: 4,
        actual_hours: 4,
        hours_allocated: 4,
        pay_status: 'approved',
        approved_at: ISO(1),
        contractors: { hourly_rate: 50 },
      },
    ],
    ...partial,
  }
}

function makeInput(partial: Partial<FinanceAttentionInput> = {}): FinanceAttentionInput {
  return {
    jobs: [],
    invoiceTotalById: new Map(),
    contractorInvoices: [],
    payRunItems: [],
    now: FIXED_NOW,
    ...partial,
  }
}

describe('buildFinanceAttentionRows — empty + clean cases', () => {
  it('returns no rows for an empty jobs array', () => {
    const result = buildFinanceAttentionRows(makeInput({ jobs: [] }))
    expect(result.rows).toEqual([])
    expect(result.totalIssueCount).toBe(0)
    expect(result.severityCounts).toEqual({ hard: 0, warning: 0, info: 0 })
  })

  it('returns no rows when every job is clean', () => {
    const result = buildFinanceAttentionRows(makeInput({ jobs: [makeJob()] }))
    expect(result.rows).toEqual([])
    expect(result.totalIssueCount).toBe(0)
    expect(result.severityCounts).toEqual({ hard: 0, warning: 0, info: 0 })
  })
})

describe('buildFinanceAttentionRows — one row per job', () => {
  it('returns the highest-severity flag and reports the remaining count', () => {
    // This job has: no client (hard), no job price (hard), no actual hours
    // (warning), completed-not-invoiced (warning, > 7 days), pay not
    // approved (warning) — reconcileJob returns hard first.
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [
          makeJob({
            client_id: null,
            job_price: null,
            completed_at: ISO(10),
            job_workers: [
              {
                contractor_id: 'c-1',
                pay_rate: 50,
                approved_hours: null,
                actual_hours: null,
                hours_allocated: 4,
                pay_status: 'pending',
                approved_at: null,
                contractors: { hourly_rate: 50 },
              },
            ],
          }),
        ],
      }),
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].flag.severity).toBe('hard')
    expect(result.rows[0].otherFlagCount).toBeGreaterThan(0)
  })

  it('uses the client name from the joined clients row when present', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [makeJob({ client_id: null, clients: { name: 'Acme Co' } })],
      }),
    )
    expect(result.rows[0].clientName).toBe('Acme Co')
  })

  it('falls back to null clientName when the join is missing', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [makeJob({ client_id: null, clients: null })],
      }),
    )
    expect(result.rows[0].clientName).toBeNull()
  })
})

describe('buildFinanceAttentionRows — severity ordering', () => {
  it('sorts hard → warning → info across multiple jobs', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [
          // warning-only: actual hours missing
          makeJob({
            id: 'job-w',
            job_number: 'J-W',
            job_workers: [
              {
                contractor_id: 'c-1',
                pay_rate: 50,
                approved_hours: null,
                actual_hours: null,
                hours_allocated: 4,
                pay_status: 'approved',
                approved_at: ISO(1),
                contractors: { hourly_rate: 50 },
              },
            ],
          }),
          // info-only: convergence flag
          makeJob({
            id: 'job-i',
            job_number: 'J-I',
          }),
          // hard: no client
          makeJob({ id: 'job-h', job_number: 'J-H', client_id: null }),
        ],
        contractorInvoices: [{ job_id: 'job-i', contractor_id: 'c-1' }],
        payRunItems: [{ job_id: 'job-i', contractor_id: 'c-1' }],
      }),
    )
    const severities = result.rows.map((r) => r.flag.severity)
    expect(severities).toEqual(['hard', 'warning', 'info'])
    expect(result.severityCounts).toEqual({ hard: 1, warning: 1, info: 1 })
  })

  it('breaks ties within a severity bucket by job_number alphabetically', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [
          makeJob({ id: 'a', job_number: 'J-0050', client_id: null }),
          makeJob({ id: 'b', job_number: 'J-0010', client_id: null }),
          makeJob({ id: 'c', job_number: 'J-0030', client_id: null }),
        ],
      }),
    )
    expect(result.rows.map((r) => r.jobNumber)).toEqual(['J-0010', 'J-0030', 'J-0050'])
  })
})

describe('buildFinanceAttentionRows — row cap', () => {
  it('caps at 25 rows by default and reports total issue count beyond the cap', () => {
    const jobs = Array.from({ length: 30 }, (_, i) =>
      makeJob({ id: `j-${i}`, job_number: `J-${String(i).padStart(4, '0')}`, client_id: null }),
    )
    const result = buildFinanceAttentionRows(makeInput({ jobs }))
    expect(result.rows).toHaveLength(25)
    expect(result.totalIssueCount).toBe(30)
    // severityCounts counts the FULL period, not just the visible rows.
    expect(result.severityCounts.hard).toBe(30)
  })

  it('respects an explicit limit override', () => {
    const jobs = Array.from({ length: 10 }, (_, i) =>
      makeJob({ id: `j-${i}`, job_number: `J-${i}`, client_id: null }),
    )
    const result = buildFinanceAttentionRows(makeInput({ jobs, limit: 3 }))
    expect(result.rows).toHaveLength(3)
    expect(result.totalIssueCount).toBe(10)
  })

  it('returns all rows when the issue count is under the cap', () => {
    const jobs = Array.from({ length: 4 }, (_, i) =>
      makeJob({ id: `j-${i}`, job_number: `J-${i}`, client_id: null }),
    )
    const result = buildFinanceAttentionRows(makeInput({ jobs }))
    expect(result.rows).toHaveLength(4)
    expect(result.totalIssueCount).toBe(4)
  })
})

describe('buildFinanceAttentionRows — invoice total wiring', () => {
  it('passes the invoice total through to reconcileJob when the job has an invoice', () => {
    // Job price $500, invoice total $600 → triggers
    // flagInvoiceTotalDiffersFromPrice (warning).
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [makeJob({ invoice_id: 'inv-1', job_price: 500 })],
        invoiceTotalById: new Map([['inv-1', 600]]),
      }),
    )
    const flagIds = result.rows.map((r) => r.flag.flag)
    expect(flagIds).toContain('invoice-total-differs')
  })

  it('does not fire the invoice-total flag when no invoice total is supplied', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [makeJob({ invoice_id: 'inv-1', job_price: 500 })],
        invoiceTotalById: new Map(),
      }),
    )
    const flagIds = result.rows.map((r) => r.flag.flag)
    expect(flagIds).not.toContain('invoice-total-differs')
  })
})

describe('buildFinanceAttentionRows — convergence ledger wiring', () => {
  it('surfaces the contractor-invoice / pay-run convergence info flag when both ledgers overlap', () => {
    const result = buildFinanceAttentionRows(
      makeInput({
        jobs: [makeJob({ id: 'job-x' })],
        contractorInvoices: [{ job_id: 'job-x', contractor_id: 'c-1' }],
        payRunItems: [{ job_id: 'job-x', contractor_id: 'c-1' }],
      }),
    )
    expect(result.rows[0]?.flag.flag).toBe('contractor-invoice-and-pay-run')
    expect(result.rows[0]?.flag.severity).toBe('info')
  })
})
