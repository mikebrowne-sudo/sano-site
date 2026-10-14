// Who has Sano already contacted? Used to keep a new cold campaign to fresh
// leads only (Mike, 2026-10-15). The New Campaign page used to tick EVERY
// eligible lead by default — including the 313 already emailed in Campaign 1
// and leads mid-conversation — so a second campaign would have re-cold-emailed
// all of them.
//
// A lead counts as previously contacted when EITHER:
//   - a campaign email was actually sent to them (sent_at set — a recipient row
//     that was queued but never sent does NOT count), or
//   - their CRM status shows we're past first contact (contacted / responded /
//     meeting / quoted / won / lost / do_not_contact) — covers phone/LinkedIn
//     outreach that never went through a campaign.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Statuses that mean the lead has been contacted (anything but 'new'). */
export const CONTACTED_STATUSES = [
  'contacted', 'responded', 'meeting', 'quoted', 'won', 'lost', 'do_not_contact',
] as const

export interface ContactHistoryEntry {
  /** Most recent campaign send (intro or follow-up), ISO. */
  lastSentAt: string
  /** Name of the campaign that last emailed them. */
  campaignName: string | null
  /** How many campaigns have emailed them. */
  campaigns: number
}

export type ContactHistory = Map<string, ContactHistoryEntry>

interface RecipientRow {
  lead_id: string
  sent_at: string | null
  followup_sent_at: string | null
  sales_campaigns: { name: string | null } | { name: string | null }[] | null
}

/** Pure: fold sent recipient rows into a per-lead history. */
export function buildContactHistory(rows: ReadonlyArray<RecipientRow>): ContactHistory {
  const out: ContactHistory = new Map()
  for (const r of rows) {
    if (!r.sent_at) continue
    const last = r.followup_sent_at && r.followup_sent_at > r.sent_at ? r.followup_sent_at : r.sent_at
    const camp = Array.isArray(r.sales_campaigns) ? r.sales_campaigns[0] : r.sales_campaigns
    const prev = out.get(r.lead_id)
    if (!prev) {
      out.set(r.lead_id, { lastSentAt: last, campaignName: camp?.name ?? null, campaigns: 1 })
    } else {
      out.set(r.lead_id, {
        lastSentAt: last > prev.lastSentAt ? last : prev.lastSentAt,
        campaignName: last > prev.lastSentAt ? (camp?.name ?? prev.campaignName) : prev.campaignName,
        campaigns: prev.campaigns + 1,
      })
    }
  }
  return out
}

/** Pure: has this lead been contacted before? */
export function isPreviouslyContacted(
  lead: { id: string; status: string | null },
  history: ContactHistory,
): boolean {
  return history.has(lead.id) || (CONTACTED_STATUSES as readonly string[]).includes(lead.status ?? '')
}

/** Load the campaign send history (optionally just for some leads). */
export async function loadContactHistory(
  supabase: SupabaseClient,
  leadIds?: string[],
): Promise<ContactHistory> {
  let q = supabase
    .from('sales_campaign_recipients')
    .select('lead_id, sent_at, followup_sent_at, sales_campaigns ( name )')
    .not('sent_at', 'is', null)
  if (leadIds && leadIds.length > 0) q = q.in('lead_id', leadIds)
  const { data } = await q
  return buildContactHistory((data ?? []) as unknown as RecipientRow[])
}
