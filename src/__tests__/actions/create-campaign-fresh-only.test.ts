/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/require-admin', () => ({ assertAdminAction: jest.fn().mockResolvedValue(undefined) }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('resend', () => ({ Resend: jest.fn() }))

import { createCampaignAction } from '@/app/portal/campaigns/_actions'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const mockedCreate = createClient as unknown as jest.Mock

function makeSupabase(leads: Array<{ id: string; company: string; status: string }>, sentLeadIds: string[]) {
  const campaignInsert = jest.fn().mockReturnValue({
    select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'camp1' }, error: null }) }),
  })
  const recipientInsert = jest.fn().mockResolvedValue({ error: null })
  const recipientsQuery: Record<string, unknown> = {
    select: () => recipientsQuery,
    not: () => recipientsQuery,
    in: () => recipientsQuery,
    insert: recipientInsert,
    then: (r: (v: unknown) => void) => r({
      data: sentLeadIds.map((lead_id) => ({ lead_id, sent_at: '2026-08-10T00:00:00Z', followup_sent_at: null, sales_campaigns: { name: 'Campaign 1' } })),
      error: null,
    }),
  }
  const from = jest.fn((t: string) => {
    if (t === 'sales_leads') return { select: () => ({ in: jest.fn().mockResolvedValue({ data: leads, error: null }) }) }
    if (t === 'sales_campaign_recipients') return recipientsQuery
    if (t === 'sales_campaigns') return { insert: campaignInsert }
    return {}
  })
  return { client: { from }, campaignInsert, recipientInsert }
}

const base = { name: 'Campaign 2', subject: 'Cleaning at {company}' }

beforeEach(() => { mockedCreate.mockReset(); (redirect as unknown as jest.Mock).mockReset() })

describe('createCampaignAction — fresh leads only', () => {
  it('creates the campaign when every lead is fresh', async () => {
    const s = makeSupabase([{ id: 'f1', company: 'Fresh Ltd', status: 'new' }], [])
    mockedCreate.mockReturnValue(s.client)
    await createCampaignAction({ ...base, leadIds: ['f1'] })
    expect(s.campaignInsert).toHaveBeenCalled()
    expect(s.recipientInsert).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/portal/campaigns/camp1')
  })

  it('refuses leads already emailed by a campaign', async () => {
    const s = makeSupabase([
      { id: 'f1', company: 'Fresh Ltd', status: 'new' },
      { id: 'e1', company: 'Emailed Ltd', status: 'new' },
    ], ['e1'])
    mockedCreate.mockReturnValue(s.client)
    const res = await createCampaignAction({ ...base, leadIds: ['f1', 'e1'] })
    expect(res).toEqual({ error: expect.stringContaining('1 selected lead has already been contacted (Emailed Ltd)') })
    expect(s.campaignInsert).not.toHaveBeenCalled()
  })

  it('refuses leads mid-conversation even if never emailed', async () => {
    const s = makeSupabase([{ id: 'm1', company: 'Meeting Co', status: 'meeting' }], [])
    mockedCreate.mockReturnValue(s.client)
    const res = await createCampaignAction({ ...base, leadIds: ['m1'] })
    expect(res).toEqual({ error: expect.stringContaining('already been contacted') })
    expect(s.campaignInsert).not.toHaveBeenCalled()
  })

  it('allows re-contact only when explicitly requested', async () => {
    const s = makeSupabase([{ id: 'e1', company: 'Emailed Ltd', status: 'contacted' }], ['e1'])
    mockedCreate.mockReturnValue(s.client)
    await createCampaignAction({ ...base, leadIds: ['e1'], allowRecontact: true })
    expect(s.campaignInsert).toHaveBeenCalled()
  })
})
