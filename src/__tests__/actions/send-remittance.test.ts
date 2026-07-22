/** @jest-environment node */

// Recipient resolution + fail-fast contract for sendContractorRemittance.
// Resend and the PDF renderer are stubbed — no real email is ever sent.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/supabase-service')
jest.mock('@/lib/contractor-remittance-data')
jest.mock('@/lib/pdf/render-pdf')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true, isAdminEmail: () => true }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({ headers: () => ({ get: () => 'sano.nz' }) }))

const mockResendSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockResendSend } })),
}))

import { sendContractorRemittance } from '@/app/portal/contractor-invoices/_actions-send-remittance'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedAuth = createClient as unknown as jest.Mock
const mockedSvc = getServiceSupabase as unknown as jest.Mock
const mockedBatch = getRemittanceBatchById as unknown as jest.Mock
const mockedRender = renderPdfFromUrl as unknown as jest.Mock

function baseBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    token: 'tok-1',
    remittanceNumber: 'RA-0001',
    paymentDate: '2026-05-08',
    reference: 'KRITIKAPAYROLL08-05-26',
    payeeLabel: null,
    notes: null,
    sentAt: null,
    lines: [],
    total: 1220,
    contractorNames: ['Kritika Kumar'],
    ...overrides,
  }
}

// Thenable Supabase query-builder stub (await resolves to { data }).
function thenable(data: unknown) {
  const b: Record<string, unknown> = {}
  b.select = () => b
  b.eq = () => b
  b.in = () => b
  b.then = (res: (v: unknown) => void) => res({ data })
  return b
}

function makeSvc(items: unknown[], contractors: unknown[]) {
  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((table: string) => {
    if (table === 'contractor_remittance_items') return thenable(items)
    if (table === 'contractors') return thenable(contractors)
    if (table === 'contractor_remittances') return { update }
    if (table === 'contractor_statements') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    if (table === 'audit_log') return { insert: auditInsert }
    return thenable([])
  })
  return { svc: { from }, update, updateEq, auditInsert }
}

beforeEach(() => {
  mockedAuth.mockReset()
  mockedSvc.mockReset()
  mockedBatch.mockReset()
  mockedRender.mockReset()
  mockResendSend.mockReset()
  mockedAuth.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@sano.nz' } } }) },
  })
  mockedRender.mockResolvedValue(Buffer.from('PDF-CONTENT'))
  mockResendSend.mockResolvedValue({ error: null })
})

describe('sendContractorRemittance — recipient resolution', () => {
  it('sends to the single contractor, attaches the named PDF, stamps sent_at', async () => {
    mockedBatch.mockResolvedValue(baseBatch())
    const { svc, update } = makeSvc(
      [{ contractor_id: 'c1' }],
      [{ id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' }],
    )
    mockedSvc.mockReturnValue(svc)

    const res = await sendContractorRemittance('r1')

    expect(res).toMatchObject({ ok: true, sentTo: 'kritika@example.com' })
    const args = mockResendSend.mock.calls[0][0]
    expect(args.to).toBe('kritika@example.com')
    expect(args.subject).toBe('Remittance advice from Sano - RA-0001')
    expect(args.html).toContain('Hi Kritika,')
    expect(args.attachments).toEqual([
      { filename: 'Sano Remittance - RA-0001.pdf', content: Buffer.from('PDF-CONTENT') },
    ])
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ sent_by: 'u1' }))
  })

  it('audits a first send (not a resend)', async () => {
    mockedBatch.mockResolvedValue(baseBatch())
    const { svc, auditInsert } = makeSvc(
      [{ contractor_id: 'c1' }],
      [{ id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' }],
    )
    mockedSvc.mockReturnValue(svc)

    await sendContractorRemittance('r1')

    const audit = auditInsert.mock.calls[0][0]
    expect(audit.action).toBe('contractor_remittance.sent')
    expect(audit.entity_id).toBe('r1')
    expect(audit.before).toBeNull()
    expect(audit.after).toMatchObject({ remittance_number: 'RA-0001', sent_to: 'kritika@example.com', total: 1220, resent: false })
  })

  it('audits a force-resend distinctly, with the previous sent time', async () => {
    mockedBatch.mockResolvedValue(baseBatch({ sentAt: '2026-05-08T03:00:00.000Z' }))
    const { svc, auditInsert, update } = makeSvc(
      [{ contractor_id: 'c1' }],
      [{ id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' }],
    )
    mockedSvc.mockReturnValue(svc)

    const res = await sendContractorRemittance('r1', { force: true })

    expect(res).toMatchObject({ ok: true })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ sent_by: 'u1' }))
    const audit = auditInsert.mock.calls[0][0]
    expect(audit.action).toBe('contractor_remittance.resent')
    expect(audit.before).toMatchObject({ sent_at: '2026-05-08T03:00:00.000Z' })
    expect(audit.after).toMatchObject({ resent: true, previous_sent_at: '2026-05-08T03:00:00.000Z' })
  })

  it('sends one email to the shared address for a combined household remittance', async () => {
    mockedBatch.mockResolvedValue(baseBatch({ contractorNames: ['Kritika Kumar', 'Anishal Kumar'], total: 830 }))
    const { svc } = makeSvc(
      [{ contractor_id: 'c1' }, { contractor_id: 'c2' }],
      [
        { id: 'c1', email: 'household@example.com', full_name: 'Kritika Kumar' },
        { id: 'c2', email: 'Household@example.com', full_name: 'Anishal Kumar' },
      ],
    )
    mockedSvc.mockReturnValue(svc)

    const res = await sendContractorRemittance('r1')

    expect(res).toMatchObject({ ok: true })
    const args = mockResendSend.mock.calls[0][0]
    expect(args.to).toBe('household@example.com')
    expect(args.html).toContain('Hi,') // generic greeting for combined
    expect(args.html).not.toContain('Hi Kritika')
  })

  it('blocks when contractors have different emails', async () => {
    mockedBatch.mockResolvedValue(baseBatch({ contractorNames: ['Kritika Kumar', 'Anishal Kumar'] }))
    const { svc } = makeSvc(
      [{ contractor_id: 'c1' }, { contractor_id: 'c2' }],
      [
        { id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' },
        { id: 'c2', email: 'anishal@example.com', full_name: 'Anishal Kumar' },
      ],
    )
    mockedSvc.mockReturnValue(svc)

    const res = await sendContractorRemittance('r1')

    expect(res.error).toMatch(/different email/i)
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('errors when no recipient email is on file', async () => {
    mockedBatch.mockResolvedValue(baseBatch())
    const { svc } = makeSvc([{ contractor_id: 'c1' }], [{ id: 'c1', email: null, full_name: 'Kritika Kumar' }])
    mockedSvc.mockReturnValue(svc)

    const res = await sendContractorRemittance('r1')

    expect(res.error).toMatch(/no recipient email/i)
    expect(mockResendSend).not.toHaveBeenCalled()
  })
})

describe('sendContractorRemittance — guards', () => {
  it('does not resend an already-sent remittance', async () => {
    mockedBatch.mockResolvedValue(baseBatch({ sentAt: '2026-05-08T03:00:00.000Z' }))
    mockedSvc.mockReturnValue(makeSvc([], []).svc)

    const res = await sendContractorRemittance('r1')

    expect(res.alreadySentAt).toBe('2026-05-08T03:00:00.000Z')
    expect(res.error).toMatch(/already sent/i)
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it('fails fast when PDF generation fails — no email, no sent stamp', async () => {
    mockedBatch.mockResolvedValue(baseBatch())
    const { svc, update } = makeSvc(
      [{ contractor_id: 'c1' }],
      [{ id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' }],
    )
    mockedSvc.mockReturnValue(svc)
    mockedRender.mockRejectedValue(new Error('puppeteer launch failed'))

    const res = await sendContractorRemittance('r1')

    expect(res.error).toMatch(/PDF generation failed/i)
    expect(mockResendSend).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does not stamp sent when the email send fails', async () => {
    mockedBatch.mockResolvedValue(baseBatch())
    const { svc, update } = makeSvc(
      [{ contractor_id: 'c1' }],
      [{ id: 'c1', email: 'kritika@example.com', full_name: 'Kritika Kumar' }],
    )
    mockedSvc.mockReturnValue(svc)
    mockResendSend.mockResolvedValue({ error: { message: 'Resend down' } })

    const res = await sendContractorRemittance('r1')

    expect(res.error).toMatch(/failed to send/i)
    expect(update).not.toHaveBeenCalled()
  })
})
