// Phase 2 (2026-08-17) — the contractor statement workflow is retired.
//
// Replaces six suites that tested the live statement pipeline:
//   generate-draft-statements · issue-contractor-statement ·
//   statement-confirm-actions · supersede-contractor-statement ·
//   process-ready-payments · contractor-confirm-statement
//
// Those tested behaviour that no longer exists. Rather than delete the coverage
// outright, this suite locks in the retirement itself: every action must fail
// closed when invoked directly, which is the property that actually matters —
// hiding a button is not the same as disabling a server action.
//
// The canonical path (contractor_invoices -> contractor_remittances) is
// deliberately NOT touched here; it never depended on statements.

import { generateDraftStatements } from '@/app/portal/contractor-statements/_actions'
import { issueContractorStatement, resendStatementIssueEmail } from '@/app/portal/contractor-statements/_actions-issue'
import { confirmStatementOnBehalf, extendReviewDeadline } from '@/app/portal/contractor-statements/_actions-confirm'
import { supersedeContractorStatement } from '@/app/portal/contractor-statements/_actions-supersede'
import {
  previewIssueAll,
  issueAllReadyStatements,
  previewProcessPayments,
  processReadyPayments,
  markRemittancesPaid,
  sendRemittanceAdvice,
} from '@/app/portal/contractor-statements/_actions-bulk'
import { confirmMyStatement } from '@/app/contractor/statements/_actions'

// Any DB access would be a failure in itself — these must never reach Supabase.
jest.mock('@/lib/supabase-server', () => ({
  createClient: () => { throw new Error('retired action reached the database') },
}))
jest.mock('@/lib/supabase-service', () => ({
  getServiceSupabase: () => { throw new Error('retired action reached the database') },
}))

describe('contractor statement workflow — retired (Phase 2)', () => {
  describe('generation', () => {
    it('generateDraftStatements refuses to create statements', async () => {
      const r = await generateDraftStatements()
      expect(r.error).toMatch(/retired/i)
      expect(r.created).toBeUndefined()
    })
  })

  describe('issue + contractor-facing email', () => {
    it('issueContractorStatement refuses to issue', async () => {
      const r = await issueContractorStatement()
      expect(r.error).toMatch(/retired/i)
      expect(r.ok).toBeUndefined()
      expect(r.emailed).toBeUndefined()
    })

    it('resendStatementIssueEmail refuses to resend', async () => {
      const r = await resendStatementIssueEmail()
      expect(r.error).toMatch(/retired/i)
      expect(r.emailed).toBeUndefined()
    })
  })

  describe('confirmation is no longer a payment gate', () => {
    it('confirmStatementOnBehalf refuses', async () => {
      expect((await confirmStatementOnBehalf()).error).toMatch(/retired/i)
    })

    it('extendReviewDeadline refuses', async () => {
      expect((await extendReviewDeadline()).error).toMatch(/retired/i)
    })

    it('confirmMyStatement (contractor portal) refuses and reassures', async () => {
      const r = await confirmMyStatement()
      expect(r.ok).toBeUndefined()
      // Contractor-facing copy must not imply they still owe an action.
      expect(r.error).toMatch(/nothing is required from you/i)
    })
  })

  describe('supersede', () => {
    it('supersedeContractorStatement refuses', async () => {
      const r = await supersedeContractorStatement()
      expect(r.error).toMatch(/retired/i)
      expect(r.released_cis).toBeUndefined()
    })
  })

  describe('bulk workflow — the money-moving path', () => {
    it('previewIssueAll refuses', async () => {
      expect((await previewIssueAll()).error).toMatch(/retired/i)
    })

    it('issueAllReadyStatements refuses and processes nothing', async () => {
      const r = await issueAllReadyStatements()
      expect(r.error).toMatch(/retired/i)
      expect(r.processed).toBe(0)
      expect(r.items).toEqual([])
    })

    it('previewProcessPayments refuses', async () => {
      expect((await previewProcessPayments()).error).toMatch(/retired/i)
    })

    it('processReadyPayments creates no remittances', async () => {
      const r = await processReadyPayments()
      expect(r.error).toMatch(/retired/i)
      expect(r.processed).toBe(0)
      expect(r.items).toEqual([])
    })

    it('markRemittancesPaid refuses via the statement entry point', async () => {
      const r = await markRemittancesPaid()
      expect(r.error).toMatch(/retired/i)
      expect(r.processed).toBe(0)
    })

    it('sendRemittanceAdvice refuses via the statement entry point', async () => {
      const r = await sendRemittanceAdvice()
      expect(r.error).toMatch(/retired/i)
      expect(r.processed).toBe(0)
    })
  })
})
