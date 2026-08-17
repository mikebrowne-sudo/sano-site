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
    // Pay date comes from the period when one is selected, else today.
    expect(page).toMatch(/period\?\.payDate \?\? today/)
  })

  // The period filter is OPTIONAL (2026-08-17). Filtering by service date hid
  // real money: an undated payable matches no period, and payables from
  // different months can never appear together — so the screen showed one
  // contractor while several were owed. Default is now "everything owed".
  it('defaults to everything owed, with the period as an optional filter', () => {
    expect(page).toMatch(/const showAll = !searchParams\.period \|\| searchParams\.period === 'all'/)
    // No period selected -> empty filter, which splitByPeriod treats as a no-op
    // and returns every payable including undated ones.
    expect(page).toMatch(/period \? \{ from: period\.periodStart, to: period\.periodEnd \} : \{\}/)
    expect(view).toMatch(/Everything owed/)
  })
  it('shows BOTH ready-to-pay (grouped authorised) AND awaiting-authorisation in ONE screen', () => {
    expect(page).toMatch(/previewRemittancesForContractors/)   // ready to pay
    expect(page).toMatch(/loadApprovalRows[\s\S]{0,80}awaitingAuthorisation/) // awaiting
    expect(view).toMatch(/Ready to pay/)
    // Phase 3 renamed this to plain-language "awaiting approval".
    expect(view).toMatch(/awaiting approval/i)
  })
  it('is the DIRECT path — no statement object / RPC in the logic', () => {
    // No statement data flow: no statement_id, no statement RPC, no statements route.
    expect(page).not.toMatch(/statement_id|create_remittance_from_statement|contractor-statements/)
    expect(view).not.toMatch(/statement_id|create_remittance_from_statement|contractor-statements/)
  })
  it('creates remittances for exactly what is shown + approves inline', () => {
    expect(view).toMatch(/createRemittancesForContractors/)
    // CRITICAL: the create call must mirror the filter that BUILT the plan,
    // or it would bundle a different set of payables than the one on screen.
    expect(view).toMatch(/period: periodStart && periodEnd \? \{ from: periodStart, to: periodEnd \} : \{\}/)
    expect(view).toMatch(/PendingApprovalsList/)   // inline approve reuse
  })

  it('warns that a period filter hides undated + out-of-period payables', () => {
    expect(view).toMatch(/no service date/i)
    expect(view).toMatch(/Clear filter/)
  })
  it('is linked as the primary "Pay run" action on the landing page', () => {
    expect(landing).toMatch(/\/portal\/contractor-invoices\/pay-run/)
    expect(landing).toMatch(/Pay run/)
  })

  // ── Phase 3: the contractor pay workspace ──────────────────────────────
  describe('Phase 3 pay workspace', () => {
    it('leads with an operational summary (owed total + awaiting count)', () => {
      expect(view).toMatch(/Ready to pay/)
      expect(view).toMatch(/Awaiting approval/)
      expect(view).toMatch(/grandTotal/)
      // Counts derive from the plan, not a separate query — and only from
      // groups with at least one VISIBLE payable item, so the summary always
      // reconciles (a period filter can leave a group with nothing showing,
      // which previously read "$0.00 · 1 payee, 0 items").
      expect(view).toMatch(/const payableGroups = groups\.filter\(\(g\) => g\.ciCount > 0\)/)
      expect(view).toMatch(/const payeeCount = payableGroups\.length/)
      expect(view).toMatch(/const itemCount = payableGroups\.reduce/)
    })

    it('groups by contractor with an expandable job breakdown', () => {
      expect(view).toMatch(/toggle\(g\.key\)/)
      expect(view).toMatch(/g\.lines\.map/)
      expect(view).toMatch(/l\.jobNumber/)
      expect(view).toMatch(/l\.jobAddress/)
    })

    it('keeps undated payables visible with an honest label', () => {
      expect(view).toMatch(/Date unavailable/)
      // Never filtered out of the display.
      expect(view).not.toMatch(/filter\(.*serviceDate == null.*\)/)
    })

    it('shows multi-cleaner jobs as context, not a warning', () => {
      expect(view).toMatch(/cleaners on this job/)
      expect(view).toMatch(/l\.workersOnJob > 1/)
    })

    it('confirms contractors, counts, amounts and payment date before creating', () => {
      expect(view).toMatch(/Confirm this pay run/)
      expect(view).toMatch(/payment date/i)
      expect(view).toMatch(/setConfirming/)
    })

    it('search narrows the DISPLAY only — payment always uses the full plan', () => {
      expect(view).toMatch(/visibleGroups/)
      // The create call reads `groups`, never `visibleGroups`, so a search box
      // can never silently shrink what gets paid.
      expect(view).toMatch(/contractorIds: groups\.flatMap/)
      expect(view).not.toMatch(/contractorIds: visibleGroups/)
    })

    it('the empty-count fix is presentation only — payment still submits the full plan', () => {
      // payableGroups drives what is COUNTED and LISTED. It must never become
      // the source for what is PAID, or filtering the view would change the
      // payment.
      expect(view).not.toMatch(/contractorIds: payableGroups/)
      expect(view).toMatch(/contractorIds: groups\.flatMap/)
    })

    it('counts undated across ALL groups so the hidden-items notice stays honest', () => {
      // Deliberately `groups`, not `payableGroups` — a group with nothing
      // visible is exactly the case the notice needs to report.
      expect(view).toMatch(/const undated = groups\.reduce\(\(s, g\) => s \+ g\.undatedCount, 0\)/)
    })
  })
})
