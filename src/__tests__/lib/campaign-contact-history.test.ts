import { buildContactHistory, isPreviouslyContacted } from '@/lib/campaigns/contact-history'

const row = (lead_id: string, sent_at: string | null, extra: Partial<{ followup_sent_at: string | null; name: string }> = {}) => ({
  lead_id,
  sent_at,
  followup_sent_at: extra.followup_sent_at ?? null,
  sales_campaigns: { name: extra.name ?? 'Campaign 1' },
})

describe('buildContactHistory', () => {
  it('only counts recipients who were actually sent an email', () => {
    const h = buildContactHistory([row('sent', '2026-08-10T00:00:00Z'), row('queued', null)])
    expect(h.has('sent')).toBe(true)
    expect(h.has('queued')).toBe(false)
  })

  it('keeps the latest send (including follow-ups) and counts campaigns', () => {
    const h = buildContactHistory([
      row('a', '2026-08-10T00:00:00Z', { name: 'Campaign 1' }),
      row('a', '2026-11-02T00:00:00Z', { followup_sent_at: '2026-11-09T00:00:00Z', name: 'Campaign 2' }),
    ])
    expect(h.get('a')).toEqual({ lastSentAt: '2026-11-09T00:00:00Z', campaignName: 'Campaign 2', campaigns: 2 })
  })
})

describe('isPreviouslyContacted', () => {
  const history = buildContactHistory([row('emailed', '2026-08-10T00:00:00Z')])

  it('is true for anyone a campaign emailed, whatever their status', () => {
    expect(isPreviouslyContacted({ id: 'emailed', status: 'new' }, history)).toBe(true)
  })

  it.each(['contacted', 'responded', 'meeting', 'quoted', 'won', 'lost', 'do_not_contact'])(
    'is true for CRM status %s (e.g. phoned, not emailed)',
    (status) => {
      expect(isPreviouslyContacted({ id: 'x', status }, history)).toBe(true)
    },
  )

  it('is false for a new lead never emailed', () => {
    expect(isPreviouslyContacted({ id: 'fresh', status: 'new' }, history)).toBe(false)
  })
})
