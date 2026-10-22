import { buildEmailHistory } from '@/lib/invoice-email-history'
import { logInvoiceSent } from '@/lib/invoice-send-log'

describe('buildEmailHistory', () => {
  it('merges sends and reminders oldest first with readable labels', () => {
    const out = buildEmailHistory(
      [
        { created_at: '2026-10-23T01:00:00Z', after: { to: 'a@b.nz', cc: ['c@d.nz'], source: 'manual' } },
        { created_at: '2026-11-20T01:00:00Z', after: { to: 'a@b.nz', source: 'recurring_auto' } },
      ],
      [{ stage: 1, sent_at: '2026-11-06T01:00:00Z', to_email: 'a@b.nz', cc_emails: null }],
    )
    expect(out.map((e) => e.label)).toEqual(['Invoice sent', 'Payment reminder 1', 'Invoice auto-sent (recurring)'])
    expect(out[0].cc).toEqual(['c@d.nz'])
    expect(out[2].cc).toEqual([])
  })

  it('tolerates a send row with no payload', () => {
    expect(buildEmailHistory([{ created_at: '2026-10-23T01:00:00Z', after: null }], [])[0]).toMatchObject({ to: '', cc: [] })
  })
})

describe('logInvoiceSent', () => {
  const log = { invoiceId: 'i-1', invoiceNumber: 'INV-1', to: 'a@b.nz', subject: 'S', resendId: 're_1', source: 'manual' as const, actorId: 'u-1' }

  it('writes an invoice.sent audit row with recipient + Resend id', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null })
    await logInvoiceSent({ from: () => ({ insert }) } as never, log)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'invoice.sent', entity_id: 'i-1', actor_role: 'staff',
      after: expect.objectContaining({ to: 'a@b.nz', resend_id: 're_1', source: 'manual' }),
    }))
  })

  it('never throws when logging fails — the email has already gone', async () => {
    await expect(logInvoiceSent({ from: () => { throw new Error('boom') } } as never, log)).resolves.toBeUndefined()
  })
})
