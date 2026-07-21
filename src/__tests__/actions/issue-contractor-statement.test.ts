/** @jest-environment node */

// Stage 1 PR B — issue action: builds the immutable snapshot, flips draft→issued
// (optimistic lock), audits, then emails; email failure never reverts the issue.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/supabase-service')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

const mockResendSend = jest.fn()
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockResendSend } })) }))

import { issueContractorStatement } from '@/app/portal/contractor-statements/_actions-issue'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'

const mockedCreate = createClient as unknown as jest.Mock
const mockedSvc = getServiceSupabase as unknown as jest.Mock

function thenable(data: unknown) {
  const b: Record<string, unknown> = {}
  b.select = () => b; b.eq = () => b; b.in = () => b; b.filter = () => b; b.limit = () => b
  b.maybeSingle = async () => ({ data: Array.isArray(data) ? (data[0] ?? null) : data, error: null })
  b.then = (res: (v: unknown) => void) => res({ data, error: null })
  return b
}

function makeDb(opts: {
  status?: string
  cis?: Array<Record<string, unknown>>
  remitted?: Array<{ contractor_invoice_id: string }>
  updateReturns?: Array<{ id: string }>
  user?: { id: string; email: string } | null
}) {
  const updateSpy = jest.fn()
  const auditSpy = jest.fn().mockResolvedValue({ error: null })
  const stmt = { id: 'st-1', statement_number: 'STMT-0001', contractor_id: 'k', period_start: '2026-07-01', period_end: '2026-07-15', status: opts.status ?? 'draft' }
  const contractor = { id: 'k', full_name: 'Kritika Kumar', email: 'kritika@example.com', legal_name: null, company_name: 'VMK LTD', business_structure: 'company', tax_review_status: null }
  const cis = opts.cis ?? [{ id: 'ci1', invoice_number: 'CI-0046', contractor_id: 'k', amount: 280, gst_status: 'not_assessed', gst_amount: null, job_id: 'j1', service_date: null, gst_supply_date: null, pay_hours: 3, pay_basis: 'hourly', notes: null, site_label: null, status: 'approved', jobs: { job_number: 'JOB-1', title: 'Clean', address: '1 St', completed_at: '2026-07-06T02:00:00Z' } }]

  const from = jest.fn((table: string) => {
    if (table === 'contractor_statements') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: stmt, error: null }) }) }),
        update: (payload: Record<string, unknown>) => { updateSpy(payload); return { eq: () => ({ eq: () => ({ select: async () => ({ data: opts.updateReturns ?? [{ id: 'st-1' }], error: null }) }) }) } },
      }
    }
    if (table === 'contractors') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: contractor, error: null }) }) }) }
    if (table === 'contractor_invoices') return thenable(cis)
    if (table === 'contractor_remittance_items') return thenable(opts.remitted ?? [])
    if (table === 'job_workers') return thenable([{ job_id: 'j1', pay_rate: 40 }])
    if (table === 'audit_log') return { insert: auditSpy }
    return thenable([])
  })

  const client = { from, auth: { getUser: async () => ({ data: { user: opts.user === undefined ? { id: 'u1', email: 'admin@sano.nz' } : opts.user } }) } }
  const notifSpy = jest.fn().mockResolvedValue({ error: null })
  const svc = { from: (t: string) => (t === 'notification_logs' ? { insert: notifSpy } : thenable([])) }
  return { client, svc, spies: { updateSpy, auditSpy, notifSpy } }
}

beforeEach(() => { mockedCreate.mockReset(); mockedSvc.mockReset(); mockResendSend.mockReset(); mockResendSend.mockResolvedValue({ error: null }) })

it('issues a draft: writes snapshot, flips to issued, audits, emails', async () => {
  const { client, svc, spies } = makeDb({})
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)

  const res = await issueContractorStatement({ id: 'st-1', review_due_at: '2026-07-26' })
  expect(res).toMatchObject({ issued: true, emailSent: true })

  const payload = spies.updateSpy.mock.calls[0][0]
  expect(payload.status).toBe('issued')
  expect(payload.issued_snapshot.statement_number).toBe('STMT-0001')
  expect(payload.issued_snapshot.supplier_name).toBe('VMK LTD')          // company entity
  expect(payload.issued_snapshot.contractor_contact_name).toBe('Kritika Kumar')
  expect(payload.issued_snapshot.total_payable).toBe(280)
  expect(payload.issued_snapshot.lines[0].rate).toBe(40)                 // from job_workers.pay_rate
  expect(spies.auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'contractor_statement.issued' }))
  expect(mockResendSend).toHaveBeenCalled()
  expect(spies.notifSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }))
})

it('email failure does NOT revert the issue (issued=true, emailSent=false)', async () => {
  const { client, svc, spies } = makeDb({})
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  mockResendSend.mockResolvedValue({ error: { message: 'Resend down' } })

  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res).toMatchObject({ issued: true, emailSent: false })
  expect(spies.updateSpy.mock.calls[0][0].status).toBe('issued') // still issued
  expect(spies.notifSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
})

it('blocks a non-draft statement', async () => {
  const { client, svc } = makeDb({ status: 'issued' })
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res.error).toMatch(/only a draft/i)
})

it('blocks an empty statement', async () => {
  const { client, svc } = makeDb({ cis: [] })
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res.error).toMatch(/empty/i)
})

it('rejects a remitted line (refresh the draft)', async () => {
  const { client, svc } = makeDb({ remitted: [{ contractor_invoice_id: 'ci1' }] })
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res.error).toMatch(/remittance/i)
})

it('aborts when the optimistic lock matches 0 rows (concurrent change)', async () => {
  const { client, svc } = makeDb({ updateReturns: [] })
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res.error).toMatch(/changed by someone else/i)
})

it('is admin-only', async () => {
  const { client, svc } = makeDb({ user: { id: 'u2', email: 'staff@sano.nz' } })
  mockedCreate.mockReturnValue(client); mockedSvc.mockReturnValue(svc)
  const res = await issueContractorStatement({ id: 'st-1' })
  expect(res).toMatchObject({ error: 'Admin only.' })
})
