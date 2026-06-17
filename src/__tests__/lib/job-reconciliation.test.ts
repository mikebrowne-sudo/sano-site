// Phase G.2 — unit tests for the job reconciliation helpers.
//
// Each describe block covers one flag helper plus its edge cases.
// Aggregator tests at the bottom guarantee deterministic order
// (hard → warning → info) and clean-job behaviour.

import {
  flagNoClient,
  flagNoScope,
  flagNoJobPrice,
  flagContractorMissingRate,
  flagActualHoursMissing,
  flagApprovedHoursMissing,
  flagHoursOverAllowed,
  flagCompletedNotInvoiced,
  flagInvoiceTotalDiffersFromPrice,
  flagLowMargin,
  flagPayNotApproved,
  flagApprovedNotInPayRun,
  flagContractorInvoiceAndPayRunBoth,
  reconcileJob,
  type ReconciliationInput,
  type ReconciliationJobInput,
  type ReconciliationWorkerInput,
} from '@/lib/job-reconciliation'

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-05-27T12:00:00Z')
const ISO = (daysAgo: number) =>
  new Date(FIXED_NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

function makeJob(partial: Partial<ReconciliationJobInput> = {}): ReconciliationJobInput {
  return {
    id: 'job-1',
    job_number: 'J-0001',
    status: 'completed',
    client_id: 'client-1',
    job_price: 500,
    allowed_hours: 4,
    description: 'Test job scope',
    scope_snapshot: null,
    invoice_id: null,
    completed_at: ISO(2),
    ...partial,
  }
}

function makeWorker(partial: Partial<ReconciliationWorkerInput> = {}): ReconciliationWorkerInput {
  return {
    contractor_id: 'c-1',
    pay_rate: 50,
    contractor_hourly_rate: null,
    approved_hours: 4,
    actual_hours: 4,
    hours_allocated: 4,
    pay_status: 'approved',
    approved_at: ISO(1),
    ...partial,
  }
}

function makeInput(partial: Partial<ReconciliationInput> = {}): ReconciliationInput {
  return {
    job: makeJob(),
    workers: [makeWorker()],
    now: FIXED_NOW,
    ...partial,
  }
}

// ─────────────────────────────────────────────────────────────────────
// HARD — flagNoClient
// ─────────────────────────────────────────────────────────────────────

describe('flagNoClient', () => {
  it('returns null when client_id is set', () => {
    expect(flagNoClient(makeInput({ job: makeJob({ client_id: 'c-1' }) }))).toBeNull()
  })

  it('flags hard when client_id is null', () => {
    const f = flagNoClient(makeInput({ job: makeJob({ client_id: null }) }))
    expect(f).toMatchObject({ flag: 'no-client', severity: 'hard' })
    expect(f?.message).toBe('No client linked')
    expect(f?.suggestedAction).toBeTruthy()
  })

  it('flags hard when client_id is empty string', () => {
    expect(flagNoClient(makeInput({ job: makeJob({ client_id: '' }) }))).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// HARD — flagNoScope
// ─────────────────────────────────────────────────────────────────────

describe('flagNoScope', () => {
  it('returns null when description is set', () => {
    expect(flagNoScope(makeInput({ job: makeJob({ description: 'cleaning', scope_snapshot: null }) }))).toBeNull()
  })

  it('returns null when scope_snapshot exists even without description', () => {
    expect(
      flagNoScope(makeInput({ job: makeJob({ description: null, scope_snapshot: { items: [] } }) })),
    ).toBeNull()
  })

  it('flags hard when both are missing', () => {
    const f = flagNoScope(makeInput({ job: makeJob({ description: null, scope_snapshot: null }) }))
    expect(f).toMatchObject({ flag: 'no-scope', severity: 'hard' })
  })

  it('treats whitespace-only description as missing', () => {
    expect(flagNoScope(makeInput({ job: makeJob({ description: '   ', scope_snapshot: null }) }))).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// HARD — flagNoJobPrice
// ─────────────────────────────────────────────────────────────────────

describe('flagNoJobPrice', () => {
  it('returns null when job_price > 0', () => {
    expect(flagNoJobPrice(makeInput({ job: makeJob({ job_price: 500 }) }))).toBeNull()
  })

  it('flags hard when job_price is null', () => {
    expect(flagNoJobPrice(makeInput({ job: makeJob({ job_price: null }) }))).toMatchObject({
      flag: 'no-job-price',
      severity: 'hard',
    })
  })

  it('flags hard when job_price is 0', () => {
    expect(flagNoJobPrice(makeInput({ job: makeJob({ job_price: 0 }) }))).not.toBeNull()
  })

  it('flags hard when job_price is negative', () => {
    expect(flagNoJobPrice(makeInput({ job: makeJob({ job_price: -1 }) }))).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// HARD — flagContractorMissingRate
// ─────────────────────────────────────────────────────────────────────

describe('flagContractorMissingRate', () => {
  it('returns null when no workers are assigned', () => {
    expect(flagContractorMissingRate(makeInput({ workers: [] }))).toBeNull()
  })

  it('returns null when worker has pay_rate', () => {
    expect(
      flagContractorMissingRate(
        makeInput({ workers: [makeWorker({ pay_rate: 50, contractor_hourly_rate: null })] }),
      ),
    ).toBeNull()
  })

  it('returns null when worker has only contractor_hourly_rate (transitional)', () => {
    expect(
      flagContractorMissingRate(
        makeInput({ workers: [makeWorker({ pay_rate: null, contractor_hourly_rate: 45 })] }),
      ),
    ).toBeNull()
  })

  it('flags hard when both rates are null on the only worker', () => {
    const f = flagContractorMissingRate(
      makeInput({ workers: [makeWorker({ pay_rate: null, contractor_hourly_rate: null })] }),
    )
    expect(f).toMatchObject({ flag: 'contractor-missing-rate', severity: 'hard' })
    expect(f?.message).toBe('Contractor has no usable rate')
  })

  it('reports a count when some but not all workers are missing rates', () => {
    const f = flagContractorMissingRate(
      makeInput({
        workers: [
          makeWorker({ contractor_id: 'a', pay_rate: 50 }),
          makeWorker({ contractor_id: 'b', pay_rate: null, contractor_hourly_rate: null }),
          makeWorker({ contractor_id: 'c', pay_rate: null, contractor_hourly_rate: null }),
        ],
      }),
    )
    expect(f).not.toBeNull()
    expect(f?.message).toBe('2 of 3 workers have no usable rate')
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagActualHoursMissing
// ─────────────────────────────────────────────────────────────────────

describe('flagActualHoursMissing', () => {
  it('returns null for draft/scheduled jobs (no expectation of actuals yet)', () => {
    expect(
      flagActualHoursMissing(
        makeInput({ job: makeJob({ status: 'assigned' }), workers: [makeWorker({ actual_hours: null })] }),
      ),
    ).toBeNull()
  })

  it('returns null when all completed-job workers have actual_hours', () => {
    expect(
      flagActualHoursMissing(
        makeInput({ job: makeJob({ status: 'completed' }), workers: [makeWorker({ actual_hours: 4 })] }),
      ),
    ).toBeNull()
  })

  it('flags warning when any completed-job worker is missing actuals', () => {
    const f = flagActualHoursMissing(
      makeInput({ job: makeJob({ status: 'completed' }), workers: [makeWorker({ actual_hours: null })] }),
    )
    expect(f).toMatchObject({ flag: 'actual-hours-missing', severity: 'warning' })
  })

  it('reports a count when only some workers are missing actuals', () => {
    const f = flagActualHoursMissing(
      makeInput({
        job: makeJob({ status: 'completed' }),
        workers: [
          makeWorker({ contractor_id: 'a', actual_hours: 4 }),
          makeWorker({ contractor_id: 'b', actual_hours: null }),
        ],
      }),
    )
    expect(f?.message).toBe('Actual hours missing for 1 of 2 workers')
  })

  it('also fires when status is invoiced', () => {
    expect(
      flagActualHoursMissing(
        makeInput({ job: makeJob({ status: 'invoiced' }), workers: [makeWorker({ actual_hours: null })] }),
      ),
    ).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagApprovedHoursMissing
// ─────────────────────────────────────────────────────────────────────

describe('flagApprovedHoursMissing', () => {
  it('returns null for draft-status jobs', () => {
    expect(
      flagApprovedHoursMissing(
        makeInput({ job: makeJob({ status: 'draft' }), workers: [makeWorker({ approved_hours: null })] }),
      ),
    ).toBeNull()
  })

  it('flags warning when a completed job is missing approved hours', () => {
    expect(
      flagApprovedHoursMissing(
        makeInput({ job: makeJob({ status: 'completed' }), workers: [makeWorker({ approved_hours: null })] }),
      ),
    ).toMatchObject({ flag: 'approved-hours-missing', severity: 'warning' })
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagHoursOverAllowed
// ─────────────────────────────────────────────────────────────────────

describe('flagHoursOverAllowed', () => {
  it('returns null when payable hours equal allowed', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: 4 }),
          workers: [makeWorker({ hours_allocated: 4, approved_hours: 4 })],
        }),
      ),
    ).toBeNull()
  })

  it('returns null when over by 10% (under 20% threshold)', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: 4 }),
          workers: [makeWorker({ hours_allocated: 4, approved_hours: 4.4 })],
        }),
      ),
    ).toBeNull()
  })

  it('returns null exactly at the 20% boundary', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: 4 }),
          workers: [makeWorker({ hours_allocated: 4, approved_hours: 4.8 })],
        }),
      ),
    ).toBeNull()
  })

  it('flags warning when over by > 20%', () => {
    const f = flagHoursOverAllowed(
      makeInput({
        job: makeJob({ allowed_hours: 4 }),
        workers: [makeWorker({ hours_allocated: 4, approved_hours: 6 })],
      }),
    )
    expect(f).toMatchObject({ flag: 'hours-over-allowed', severity: 'warning' })
    expect(f?.message).toContain('50%')
  })

  it('uses actual_hours when approved_hours is null', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: 4 }),
          workers: [makeWorker({ hours_allocated: 4, approved_hours: null, actual_hours: 6 })],
        }),
      ),
    ).not.toBeNull()
  })

  it('falls back to job.allowed_hours/worker_count when hours_allocated is null', () => {
    // 8h allowed across 2 workers → 4h per worker; one worker at 5.5h is +37.5%
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: 8 }),
          workers: [
            makeWorker({ contractor_id: 'a', hours_allocated: null, approved_hours: 4 }),
            makeWorker({ contractor_id: 'b', hours_allocated: null, approved_hours: 5.5 }),
          ],
        }),
      ),
    ).not.toBeNull()
  })

  it('returns null when no allowed hours data is available', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          job: makeJob({ allowed_hours: null }),
          workers: [makeWorker({ hours_allocated: null, approved_hours: 6 })],
        }),
      ),
    ).toBeNull()
  })

  it('returns null when no payable hours are captured', () => {
    expect(
      flagHoursOverAllowed(
        makeInput({
          workers: [makeWorker({ approved_hours: null, actual_hours: null })],
        }),
      ),
    ).toBeNull()
  })

  it('reports the WORST per-worker variance, not the sum', () => {
    // 4h allowed each; worker A at 4.5 (+12.5%), worker B at 5.2 (+30%) → 30%
    const f = flagHoursOverAllowed(
      makeInput({
        workers: [
          makeWorker({ contractor_id: 'a', hours_allocated: 4, approved_hours: 4.5 }),
          makeWorker({ contractor_id: 'b', hours_allocated: 4, approved_hours: 5.2 }),
        ],
      }),
    )
    expect(f?.message).toContain('30%')
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagCompletedNotInvoiced
// ─────────────────────────────────────────────────────────────────────

describe('flagCompletedNotInvoiced', () => {
  it('returns null when job is not completed', () => {
    expect(
      flagCompletedNotInvoiced(
        makeInput({ job: makeJob({ status: 'invoiced', invoice_id: 'inv-1', completed_at: ISO(10) }) }),
      ),
    ).toBeNull()
  })

  it('returns null when job has an invoice', () => {
    expect(
      flagCompletedNotInvoiced(
        makeInput({ job: makeJob({ status: 'completed', invoice_id: 'inv-1', completed_at: ISO(10) }) }),
      ),
    ).toBeNull()
  })

  it('returns null when completed under the 7-day threshold', () => {
    expect(
      flagCompletedNotInvoiced(
        makeInput({ job: makeJob({ status: 'completed', invoice_id: null, completed_at: ISO(3) }) }),
      ),
    ).toBeNull()
  })

  it('flags warning at >= 7 days', () => {
    const f = flagCompletedNotInvoiced(
      makeInput({ job: makeJob({ status: 'completed', invoice_id: null, completed_at: ISO(10) }) }),
    )
    expect(f).toMatchObject({ flag: 'completed-not-invoiced', severity: 'warning' })
    expect(f?.message).toContain('10 days')
  })

  it('returns null when completed_at is null', () => {
    expect(
      flagCompletedNotInvoiced(
        makeInput({ job: makeJob({ status: 'completed', invoice_id: null, completed_at: null }) }),
      ),
    ).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagInvoiceTotalDiffersFromPrice
// ─────────────────────────────────────────────────────────────────────

describe('flagInvoiceTotalDiffersFromPrice', () => {
  it('returns null when no invoice is supplied', () => {
    expect(flagInvoiceTotalDiffersFromPrice(makeInput({ invoice: null }))).toBeNull()
  })

  it('returns null when totals match exactly', () => {
    expect(
      flagInvoiceTotalDiffersFromPrice(
        makeInput({ job: makeJob({ job_price: 500 }), invoice: { total: 500 } }),
      ),
    ).toBeNull()
  })

  it('returns null inside the ±1¢ tolerance', () => {
    expect(
      flagInvoiceTotalDiffersFromPrice(
        makeInput({ job: makeJob({ job_price: 500 }), invoice: { total: 500.01 } }),
      ),
    ).toBeNull()
  })

  it('flags warning when totals differ beyond tolerance', () => {
    expect(
      flagInvoiceTotalDiffersFromPrice(
        makeInput({ job: makeJob({ job_price: 500 }), invoice: { total: 525 } }),
      ),
    ).toMatchObject({ flag: 'invoice-total-differs', severity: 'warning' })
  })

  it('returns null when job_price is null', () => {
    expect(
      flagInvoiceTotalDiffersFromPrice(
        makeInput({ job: makeJob({ job_price: null }), invoice: { total: 500 } }),
      ),
    ).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagLowMargin
// ─────────────────────────────────────────────────────────────────────

describe('flagLowMargin', () => {
  it('returns null when margin is healthy', () => {
    // labour 200, price 500 → margin 60%
    expect(
      flagLowMargin(
        makeInput({
          job: makeJob({ job_price: 500 }),
          workers: [makeWorker({ pay_rate: 50, approved_hours: 4 })],
        }),
      ),
    ).toBeNull()
  })

  it('flags warning when margin is below 10%', () => {
    // labour 470 (10 allowed hrs × 47), price 500 → 6%
    const f = flagLowMargin(
      makeInput({
        job: makeJob({ job_price: 500 }),
        workers: [makeWorker({ pay_rate: 47, hours_allocated: 10 })],
      }),
    )
    expect(f).toMatchObject({ flag: 'low-margin', severity: 'warning' })
    expect(f?.message).toMatch(/Low margin \(\d+%\)/)
  })

  it('labels negative margin specifically', () => {
    // labour 600 (10 allowed hrs × 60), price 500 → -20%
    const f = flagLowMargin(
      makeInput({
        job: makeJob({ job_price: 500 }),
        workers: [makeWorker({ pay_rate: 60, hours_allocated: 10 })],
      }),
    )
    expect(f?.message).toMatch(/^Negative margin/)
  })

  it('returns null when no labour cost is known yet', () => {
    // Avoids false-flagging draft jobs with no hours captured.
    expect(
      flagLowMargin(
        makeInput({
          job: makeJob({ job_price: 500 }),
          workers: [makeWorker({ pay_rate: null, contractor_hourly_rate: null, approved_hours: null, actual_hours: null })],
        }),
      ),
    ).toBeNull()
  })

  it('returns null when job_price is null', () => {
    expect(flagLowMargin(makeInput({ job: makeJob({ job_price: null }) }))).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagPayNotApproved
// ─────────────────────────────────────────────────────────────────────

describe('flagPayNotApproved', () => {
  it('returns null for non-completed jobs', () => {
    expect(
      flagPayNotApproved(
        makeInput({ job: makeJob({ status: 'assigned' }), workers: [makeWorker({ pay_status: 'pending' })] }),
      ),
    ).toBeNull()
  })

  it('returns null when all workers are approved or beyond', () => {
    expect(
      flagPayNotApproved(
        makeInput({ workers: [makeWorker({ pay_status: 'approved' })] }),
      ),
    ).toBeNull()
    expect(
      flagPayNotApproved(
        makeInput({ workers: [makeWorker({ pay_status: 'paid' })] }),
      ),
    ).toBeNull()
  })

  it('flags warning when a worker is pending', () => {
    expect(
      flagPayNotApproved(
        makeInput({ workers: [makeWorker({ pay_status: 'pending' })] }),
      ),
    ).toMatchObject({ flag: 'pay-not-approved', severity: 'warning' })
  })

  it('treats null pay_status as pending', () => {
    expect(
      flagPayNotApproved(
        makeInput({ workers: [makeWorker({ pay_status: null })] }),
      ),
    ).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// WARNING — flagApprovedNotInPayRun
// ─────────────────────────────────────────────────────────────────────

describe('flagApprovedNotInPayRun', () => {
  it('returns null when no worker is approved-and-waiting', () => {
    expect(
      flagApprovedNotInPayRun(
        makeInput({ workers: [makeWorker({ pay_status: 'included_in_pay_run' })] }),
      ),
    ).toBeNull()
  })

  it('returns null when approved < 14 days ago', () => {
    expect(
      flagApprovedNotInPayRun(
        makeInput({ workers: [makeWorker({ pay_status: 'approved', approved_at: ISO(10) })] }),
      ),
    ).toBeNull()
  })

  it('flags warning at >= 14 days', () => {
    expect(
      flagApprovedNotInPayRun(
        makeInput({ workers: [makeWorker({ pay_status: 'approved', approved_at: ISO(14) })] }),
      ),
    ).toMatchObject({ flag: 'approved-not-in-pay-run', severity: 'warning' })
  })

  it('uses current remittance wording and links to Pending approvals (no retired pay-run wording)', () => {
    const f = flagApprovedNotInPayRun(
      makeInput({ workers: [makeWorker({ pay_status: 'approved', approved_at: ISO(20) })] }),
    )!
    expect(f.message).toMatch(/awaiting remittance/i)
    expect(f.message).not.toMatch(/waiting for a pay run/i)
    expect(f.suggestedAction).toMatch(/pending approvals/i)
    expect(f.href).toBe('/portal/contractor-invoices/pending-approvals')
  })

  it('returns null when approved_at is missing', () => {
    expect(
      flagApprovedNotInPayRun(
        makeInput({ workers: [makeWorker({ pay_status: 'approved', approved_at: null })] }),
      ),
    ).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────
// INFO — flagContractorInvoiceAndPayRunBoth
// ─────────────────────────────────────────────────────────────────────

describe('flagContractorInvoiceAndPayRunBoth', () => {
  it('returns null when neither ledger has rows', () => {
    expect(flagContractorInvoiceAndPayRunBoth(makeInput({}))).toBeNull()
  })

  it('returns null when only contractor_invoices has rows', () => {
    expect(
      flagContractorInvoiceAndPayRunBoth(
        makeInput({ contractorInvoices: [{ job_id: 'job-1', contractor_id: 'c-1' }], payRunItems: [] }),
      ),
    ).toBeNull()
  })

  it('returns null when ledgers have no overlap on (job_id, contractor_id)', () => {
    expect(
      flagContractorInvoiceAndPayRunBoth(
        makeInput({
          contractorInvoices: [{ job_id: 'job-1', contractor_id: 'c-1' }],
          payRunItems: [{ job_id: 'job-1', contractor_id: 'c-2' }],
        }),
      ),
    ).toBeNull()
  })

  it('flags info on overlap (convergence, not error)', () => {
    const f = flagContractorInvoiceAndPayRunBoth(
      makeInput({
        contractorInvoices: [{ job_id: 'job-1', contractor_id: 'c-1' }],
        payRunItems: [{ job_id: 'job-1', contractor_id: 'c-1' }],
      }),
    )
    expect(f).toMatchObject({ flag: 'contractor-invoice-and-pay-run', severity: 'info' })
  })
})

// ─────────────────────────────────────────────────────────────────────
// reconcileJob — aggregator behaviour
// ─────────────────────────────────────────────────────────────────────

describe('reconcileJob', () => {
  it('returns no flags for a clean completed job', () => {
    expect(reconcileJob(makeInput({}))).toEqual([])
  })

  it('returns hard flags ordered first, then warnings, then info', () => {
    const flags = reconcileJob(
      makeInput({
        job: makeJob({
          status: 'completed',
          client_id: null,           // hard
          job_price: null,           // hard
          completed_at: ISO(10),     // → warning (completed-not-invoiced)
        }),
        workers: [
          makeWorker({ pay_status: 'pending' }), // warning (pay not approved)
        ],
        contractorInvoices: [{ job_id: 'job-1', contractor_id: 'c-1' }],
        payRunItems: [{ job_id: 'job-1', contractor_id: 'c-1' }],
      }),
    )
    const severities = flags.map((f) => f.severity)
    const sortedSeverities = [...severities].sort((a, b) => {
      const rank = { hard: 0, warning: 1, info: 2 } as const
      return rank[a] - rank[b]
    })
    expect(severities).toEqual(sortedSeverities)
    // Specific ordering: no-client before no-job-price (declaration order).
    const hardFlags = flags.filter((f) => f.severity === 'hard').map((f) => f.flag)
    expect(hardFlags).toEqual(['no-client', 'no-job-price'])
  })

  it('reports the convergence info flag alongside warnings', () => {
    const flags = reconcileJob(
      makeInput({
        contractorInvoices: [{ job_id: 'job-1', contractor_id: 'c-1' }],
        payRunItems: [{ job_id: 'job-1', contractor_id: 'c-1' }],
      }),
    )
    expect(flags.map((f) => f.flag)).toContain('contractor-invoice-and-pay-run')
  })

  it('every flag has a stable shape', () => {
    const flags = reconcileJob(
      makeInput({
        job: makeJob({ client_id: null }),
        workers: [makeWorker({ pay_rate: null, contractor_hourly_rate: null })],
      }),
    )
    for (const f of flags) {
      expect(typeof f.flag).toBe('string')
      expect(['hard', 'warning', 'info']).toContain(f.severity)
      expect(typeof f.message).toBe('string')
      expect(f.message.length).toBeGreaterThan(0)
    }
  })

  it('handles a draft job (mostly hard checks only)', () => {
    const flags = reconcileJob(
      makeInput({
        job: makeJob({ status: 'draft', completed_at: null }),
        workers: [makeWorker({ approved_hours: null, actual_hours: null, pay_status: 'pending' })],
      }),
    )
    // Should not contain warnings that only make sense post-execution.
    expect(flags.map((f) => f.flag)).not.toContain('actual-hours-missing')
    expect(flags.map((f) => f.flag)).not.toContain('approved-hours-missing')
    expect(flags.map((f) => f.flag)).not.toContain('pay-not-approved')
    expect(flags.map((f) => f.flag)).not.toContain('completed-not-invoiced')
  })
})
