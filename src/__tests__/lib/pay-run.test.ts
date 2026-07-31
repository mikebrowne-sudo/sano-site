import { readFileSync } from 'fs'
import { join } from 'path'
import { awaitingAuthorisation } from '@/lib/contractor-pay-approvals-data'
import type { ApprovalRow } from '@/app/portal/contractor-invoices/pending-approvals/_components/PendingApprovalsList'

const row = (over: Partial<ApprovalRow>): ApprovalRow => ({
  jobId: 'j', contractorId: 'c', jobNumber: 'JOB-1', jobAddress: null, completedAt: '2026-07-05',
  jobStatus: 'completed', contractorName: 'Ann', note: null, allowedHours: 2, submittedHours: null,
  defaultApprovedHours: 2, rate: 30, mode: 'hourly', computedAmount: 60, flags: [],
  readiness: 'ready', existingCI: null, ...over,
})

describe('awaitingAuthorisation — only jobs without an approved payable', () => {
  it('keeps ready/needs-review rows, drops already-approved', () => {
    const rows = [
      row({ jobId: 'a', readiness: 'ready' }),
      row({ jobId: 'b', readiness: 'needs_review' }),
      row({ jobId: 'c', readiness: 'already_approved', existingCI: { id: 'ci', invoice_number: 'CI-1', status: 'approved' } }),
    ]
    const out = awaitingAuthorisation(rows)
    expect(out.map((r) => r.jobId)).toEqual(['a', 'b'])
  })
})

describe('Pay-run screen wiring (source-level)', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/pay-run/page.tsx'), 'utf8')
  const view = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/pay-run/_components/PayRunView.tsx'), 'utf8')
  const landing = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/page.tsx'), 'utf8')

  it('is admin-gated', () => {
    expect(page).toMatch(/isAdminUser/)
    expect(page).toMatch(/notFound\(\)/)
  })
  it('uses the fortnightly pay-period lib (real 30th/15th pay dates)', () => {
    expect(page).toMatch(/recentPayPeriods/)
    expect(page).toMatch(/payPeriodForKey/)
    expect(page).toMatch(/period\.payDate/)
  })
  it('shows BOTH ready-to-pay (grouped authorised) AND awaiting-authorisation in ONE screen', () => {
    expect(page).toMatch(/previewRemittancesForContractors/)   // ready to pay
    expect(page).toMatch(/loadApprovalRows[\s\S]{0,80}awaitingAuthorisation/) // awaiting
    expect(view).toMatch(/Ready to pay/)
    expect(view).toMatch(/awaiting authorisation/i)
  })
  it('is the DIRECT path — no statement object / RPC in the logic', () => {
    // No statement data flow: no statement_id, no statement RPC, no statements route.
    expect(page).not.toMatch(/statement_id|create_remittance_from_statement|contractor-statements/)
    expect(view).not.toMatch(/statement_id|create_remittance_from_statement|contractor-statements/)
  })
  it('creates remittances for the selected period + approves inline', () => {
    expect(view).toMatch(/createRemittancesForContractors/)
    expect(view).toMatch(/period: \{ from: periodStart, to: periodEnd \}/)
    expect(view).toMatch(/PendingApprovalsList/)   // inline approve reuse
  })
  it('is linked as the primary "Pay run" action on the landing page', () => {
    expect(landing).toMatch(/\/portal\/contractor-invoices\/pay-run/)
    expect(landing).toMatch(/Pay run/)
  })
})
