/** @jest-environment node */

// The drip sends best leads first (A→B→C) and only up to the limit, leaving the
// rest pending for the next daily batch. This exercises the ordering + limit via
// a fake supabase + a stubbed Resend send.

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ error: null }) },
  })),
}))

import { sendCampaignBatch } from '@/lib/campaigns/send-batch'

function fakeSupabase(pending: Array<{ id: string; rank: string; company: string; email: string; approved?: boolean; emailName?: string }>) {
  const updates: Array<{ table: string; patch: Record<string, unknown>; id?: string }> = []
  const client = {
    from(table: string) {
      if (table === 'sales_campaigns') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'c1', subject: 'Cleaning at {company}', from_name: 'Carol Browne', from_email: 'carol@sano.nz', signature_name: 'Carol Browne', signature_banner_url: null, reply_to: 'carol@sano.nz' }, error: null }) }) }) }
      }
      if (table === 'sales_campaign_recipients') {
        return {
          select: () => ({ eq: () => ({ eq: async () => ({
            data: pending.map((p) => ({ id: p.id, token: 't-' + p.id, status: 'pending', company_name_approved: !!p.approved, lead: { id: 'l-' + p.id, company: p.company, email_business_name: p.emailName ?? p.company, contact_name: 'X', email: p.email, status: 'new', unsubscribed_at: null, quality_rank: p.rank } })),
            error: null,
          }) }) }),
          update: (patch: Record<string, unknown>) => ({ eq: (_c: string, id: string) => { updates.push({ table, patch, id }); return Promise.resolve({ error: null }) } }),
        }
      }
      // sales_leads
      return { update: (patch: Record<string, unknown>) => ({ eq: () => ({ eq: () => { updates.push({ table, patch }); return Promise.resolve({ error: null }) } }) }) }
    },
  }
  return { client: client as never, updates }
}

describe('sendCampaignBatch — A→B→C order + daily limit', () => {
  it('sends only `limit` recipients, best grade first, leaving the rest pending', async () => {
    const { client, updates } = fakeSupabase([
      { id: '1', rank: 'C', company: 'Cee Ltd', email: 'c@x.co' },
      { id: '2', rank: 'A', company: 'Aay Ltd', email: 'a@x.co' },
      { id: '3', rank: 'B', company: 'Bee Ltd', email: 'b@x.co' },
      { id: '4', rank: 'A', company: 'Aaa Ltd', email: 'a2@x.co' },
    ])
    const { result } = await sendCampaignBatch(client, 'c1', { limit: 2 })
    expect(result).toMatchObject({ sent: 2, failed: 0, skipped: 0 })
    expect(result!.remaining).toBe(2) // 4 pending - 2 sent

    // The two 'sent' recipient rows must be the A-grade ones (ids 4 & 2, sorted by company: Aaa then Aay).
    const sentIds = updates.filter((u) => u.table === 'sales_campaign_recipients' && u.patch.status === 'sent').map((u) => u.id)
    expect(new Set(sentIds)).toEqual(new Set(['4', '2']))
  })

  it('limit = Infinity sends everything (remaining 0)', async () => {
    const { client } = fakeSupabase([
      { id: '1', rank: 'A', company: 'Acme Ltd', email: 'a@x.co' },
      { id: '2', rank: 'B', company: 'Bee Ltd', email: 'b@x.co' },
    ])
    const { result } = await sendCampaignBatch(client, 'c1', { limit: Infinity })
    expect(result).toMatchObject({ sent: 2, remaining: 0 })
  })

  it('skips a recipient whose flagged email business name is NOT approved (never interpolated)', async () => {
    const { client, updates } = fakeSupabase([
      { id: '1', rank: 'A', company: 'Good Co Ltd', email: 'a@x.co', emailName: 'Good Co' },
      { id: '2', rank: 'A', company: 'Bentleys Ltd', email: 'b@x.co', emailName: 'Bentleys — Nick den Heijer CONFIRMED' }, // flagged email name, not approved
    ])
    const { result } = await sendCampaignBatch(client, 'c1', { limit: Infinity })
    expect(result).toMatchObject({ sent: 1, skipped: 1 })
    const sentIds = updates.filter((u) => u.table === 'sales_campaign_recipients' && u.patch.status === 'sent').map((u) => u.id)
    expect(sentIds).toEqual(['1']) // only the clean email name was sent
  })

  it('skips a recipient whose email business name is BLANK (unresolved)', async () => {
    const { client } = fakeSupabase([
      { id: '1', rank: 'A', company: 'Acme Ltd', email: 'a@x.co', emailName: '' }, // blank email name → block
    ])
    const { result } = await sendCampaignBatch(client, 'c1', { limit: Infinity })
    expect(result).toMatchObject({ sent: 0, skipped: 1 })
  })

  it('sends a flagged email name once it has been explicitly approved', async () => {
    const { client } = fakeSupabase([
      { id: '2', rank: 'A', company: 'Acme Ltd', email: 'b@x.co', emailName: 'ACME SHOUTING', approved: true }, // flagged (all-caps) but approved
    ])
    const { result } = await sendCampaignBatch(client, 'c1', { limit: Infinity })
    expect(result).toMatchObject({ sent: 1, skipped: 0 })
  })
})
