// Shared campaign send logic — used by the manual "send" action AND the daily
// drip cron, so both send identically. Sends up to `limit` pending recipients,
// best leads first (A → B → C) for faster sender warm-up. Fail-soft per
// recipient. Returns the tallies; the caller manages campaign status.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderCommercialIntro, listUnsubscribeHeader } from '@/lib/campaigns/template'

const RANK_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 }

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
}

export interface SendBatchResult {
  sent: number
  failed: number
  skipped: number
  remaining: number
}

/**
 * Send up to `limit` pending recipients of a campaign (A→B→C order). Pass
 * limit = Infinity to send everything. Does NOT change campaign status — the
 * caller decides whether the campaign is now 'sending', 'sent', etc.
 */
export async function sendCampaignBatch(
  supabase: SupabaseClient,
  campaignId: string,
  opts: { limit: number },
): Promise<{ result?: SendBatchResult; error?: string }> {
  const { data: campaign, error: cErr } = await supabase
    .from('sales_campaigns')
    .select('id, subject, from_name, from_email, signature_name, signature_banner_url, reply_to')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }

  // Pending recipients + the lead's grade so we can send best-first.
  const { data: recipientsRaw, error: rErr } = await supabase
    .from('sales_campaign_recipients')
    .select('id, token, status, lead:sales_leads(id, company, contact_name, email, status, unsubscribed_at, quality_rank)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
  if (rErr) return { error: `Failed to load recipients: ${rErr.message}` }

  const recipients = (recipientsRaw ?? []).map((r) => ({
    ...r,
    lead: Array.isArray(r.lead) ? r.lead[0] : r.lead,
  }))

  // A → B → C, then stable by company.
  recipients.sort((a, b) => {
    const ra = RANK_ORDER[a.lead?.quality_rank as string] ?? 9
    const rb = RANK_ORDER[b.lead?.quality_rank as string] ?? 9
    return ra - rb || (a.lead?.company ?? '').localeCompare(b.lead?.company ?? '')
  })

  const totalPending = recipients.length
  const batch = recipients.slice(0, Math.max(0, opts.limit))

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0, failed = 0, skipped = 0

  for (const r of batch) {
    const lead = r.lead
    if (!lead || !lead.email || lead.unsubscribed_at || lead.status === 'do_not_contact') {
      await supabase.from('sales_campaign_recipients').update({ status: 'skipped', error: 'No email or opted out' }).eq('id', r.id)
      skipped++
      continue
    }

    const rendered = renderCommercialIntro({
      lead: { company: lead.company, contact_name: lead.contact_name, email: lead.email },
      token: r.token,
      siteUrl: siteUrl(),
      subject: campaign.subject,
      sender: {
        name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
        bannerUrl: (campaign as { signature_banner_url?: string | null }).signature_banner_url || null,
      },
    })
    const fromEmail = (campaign as { from_email?: string | null }).from_email || 'noreply@sano.nz'

    const { error: sendErr } = await resend.emails.send({
      from: `${campaign.from_name} <${fromEmail}>`,
      to: lead.email,
      replyTo: campaign.reply_to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: listUnsubscribeHeader(campaign.reply_to),
    })

    if (sendErr) {
      await supabase.from('sales_campaign_recipients').update({ status: 'failed', error: sendErr.message }).eq('id', r.id)
      failed++
    } else {
      // Record what was actually sent (audit): subject, variant, from-address.
      await supabase.from('sales_campaign_recipients').update({
        status: 'sent', sent_at: new Date().toISOString(), error: null,
        sent_subject: rendered.subject, sent_variant: rendered.variant, sent_from: fromEmail,
      }).eq('id', r.id)
      await supabase.from('sales_leads').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', lead.id).eq('status', 'new')
      sent++
    }
  }

  // Skipped rows are removed from the queue; only the truly-sendable count as
  // "processed" against the daily cap idea.
  const remaining = totalPending - sent - failed - skipped
  return { result: { sent, failed, skipped, remaining } }
}
