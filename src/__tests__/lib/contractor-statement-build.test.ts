import { buildDraftGroups, isCarriedForward, type EligibleLine } from '@/lib/contractor-statement-build'
import type { StatementPeriod } from '@/lib/contractor-statement-period'

const PERIOD: StatementPeriod = { period_start: '2026-07-01', period_end: '2026-07-15' }

function line(over: Partial<EligibleLine> & { id: string; contractor_id: string; amount: number; service_date: string }): EligibleLine {
  return {
    contractor_name: over.contractor_name ?? 'Someone',
    invoice_number: over.invoice_number ?? 'CI-0000',
    gst_status: over.gst_status ?? 'not_assessed',
    gst_amount: over.gst_amount ?? null,
    ...over,
  }
}

describe('buildDraftGroups — grouping by contractor', () => {
  it('groups eligible lines into one draft per contractor', () => {
    const groups = buildDraftGroups([
      line({ id: '1', contractor_id: 'k', contractor_name: 'Kritika', amount: 280, service_date: '2026-07-01' }),
      line({ id: '2', contractor_id: 'k', contractor_name: 'Kritika', amount: 140, service_date: '2026-07-03' }),
      line({ id: '3', contractor_id: 'm', contractor_name: 'Marina', amount: 350, service_date: '2026-07-06' }),
    ], PERIOD)
    expect(groups.map((g) => g.contractor_id).sort()).toEqual(['k', 'm'])
    const k = groups.find((g) => g.contractor_id === 'k')!
    expect(k.line_count).toBe(2)
    expect(k.subtotal).toBe(420)
    expect(k.total_payable).toBe(420)
  })
})

describe('GST totals — only gst_status = applied is confirmed', () => {
  it('sums gst_amount for applied lines only; flagged rows counted but not confirmed', () => {
    const groups = buildDraftGroups([
      line({ id: '1', contractor_id: 'c', amount: 230, gst_status: 'applied', gst_amount: 30, service_date: '2026-07-02' }),
      line({ id: '2', contractor_id: 'c', amount: 115, gst_status: 'pending_review', gst_amount: 15, service_date: '2026-07-03' }),
      line({ id: '3', contractor_id: 'c', amount: 100, gst_status: 'not_assessed', gst_amount: null, service_date: '2026-07-04' }),
    ], PERIOD)
    const g = groups[0]
    expect(g.subtotal).toBe(445)          // full GST-inclusive amounts
    expect(g.total_payable).toBe(445)     // unchanged by GST treatment
    expect(g.gst_total).toBe(30)          // only the applied line's GST
    expect(g.gst_applied_lines).toBe(1)
    expect(g.gst_review_lines).toBe(2)    // pending_review + not_assessed
  })

  it('flagged GST never blocks: an all-flagged group still builds with gst_total 0', () => {
    const groups = buildDraftGroups([
      line({ id: '1', contractor_id: 'c', amount: 290, gst_status: 'not_assessed', gst_amount: null, service_date: '2026-07-05' }),
    ], PERIOD)
    expect(groups[0].gst_total).toBe(0)
    expect(groups[0].total_payable).toBe(290)
    expect(groups[0].gst_review_lines).toBe(1)
  })
})

describe('carry-forward identification', () => {
  it('flags lines whose service date precedes the statement period', () => {
    expect(isCarriedForward('2026-06-30', '2026-07-01')).toBe(true)
    expect(isCarriedForward('2026-07-01', '2026-07-01')).toBe(false)
    const groups = buildDraftGroups([
      line({ id: '1', contractor_id: 'u', contractor_name: 'Upasni', amount: 130, service_date: '2026-05-21' }), // carried
      line({ id: '2', contractor_id: 'u', contractor_name: 'Upasni', amount: 70, service_date: '2026-07-08' }),  // in-period
    ], PERIOD)
    expect(groups[0].carried_lines).toBe(1)
  })

  it('carry-forward works for a jobless fixed/manual CI (grouped by resolved service date)', () => {
    // A jobless CI resolved to a June service date lands as carried-forward on
    // the July statement — same rule as job-derived lines.
    const groups = buildDraftGroups([
      line({ id: 'fix', contractor_id: 'f', contractor_name: 'FixedCo', amount: 500, service_date: '2026-06-30', invoice_number: 'CI-FIX' }),
    ], PERIOD)
    expect(groups[0].carried_lines).toBe(1)
    expect(groups[0].total_payable).toBe(500)
  })
})

describe('mixed job-derived and jobless CIs', () => {
  it('groups job-derived and jobless lines into the same contractor statement', () => {
    const groups = buildDraftGroups([
      line({ id: 'job', contractor_id: 'c', contractor_name: 'MixCo', amount: 200, service_date: '2026-07-06', invoice_number: 'CI-JOB' }),
      line({ id: 'fix', contractor_id: 'c', contractor_name: 'MixCo', amount: 300, service_date: '2026-07-10', invoice_number: 'CI-FIX' }),
    ], PERIOD)
    expect(groups).toHaveLength(1)
    expect(groups[0].line_count).toBe(2)
    expect(groups[0].subtotal).toBe(500)
    expect(groups[0].lines.map((l) => l.id)).toEqual(['job', 'fix']) // sorted by service date
  })
})
