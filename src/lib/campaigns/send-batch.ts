// Shared campaign send logic — used by the manual "send" action AND the daily
// drip cron, so both send identically. Sends up to `limit` pending recipients,
// best leads first (A → B → C) for faster sender warm-up. Fail-soft per
// recipient. Returns the tallies; the caller manages campaign status.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderCommercialIntro, renderCommercialFollowup, listUnsubscribeHeader } from '@/lib/campaigns/template'
import { isCompanyNameClean } from '@/lib/campaigns/company-name-quality'

const RANK_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 }

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
}

/** NZ weekday (1=Mon..7=Sun) for a date. Campaign sends run Mon–Thu only. */
export function nzWeekday(d: Date): number {
  const wd = new Date(d.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' })).getDay()
  return wd === 0 ? 7 : wd
}
/** True on Mon–Thu (1–4) NZ time — the only days campaign email goes out. */
export function isCampaignSendDay(d: Date): boolean {
  const wd = nzWeekday(d)
  return wd >= 1 && wd <= 4
}
/** Count business days (Mon–Fri) strictly after `from`, up to `to`. */
export function businessDaysBetween(fromIso: string, to: Date): number {
  let count = 0
  const cur = new Date(fromIso)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)
  while (cur < end) {
    cur.setUTCDate(cur.getUTCDate() + 1)
    const wd = nzWeekday(cur)
    if (wd >= 1 && wd <= 5) count++
  }
  return count
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
    .select('id, subject, subject_a, subject_b, from_name, from_email, signature_name, signature_banner_url, reply_to')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }

  const subjectA = (campaign as { subject_a?: string | null }).subject_a || campaign.subject
  const subjectB = (campaign as { subject_b?: string | null }).subject_b || null

  // Pending recipients + grade (best-first) + their assigned A/B subject bucket.
  const { data: recipientsRaw, error: rErr } = await supabase
    .from('sales_campaign_recipients')
    .select('id, token, status, subject_variant, company_name_approved, lead:sales_leads(id, company, email_business_name, contact_name, email, status, unsubscribed_at, quality_rank)')
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

    // The interpolated business name is the campaign-facing `email_business_name`
    // (NOT the CRM `company`). Belt-and-braces name safety (covers the daily cron,
    // not just the launch gate): skip any lead whose email business name is
    // blank/unsafe and not explicitly approved. Leave it pending to fix/approve.
    const emailName = (lead.email_business_name ?? '').trim()
    const approved = !!(r as { company_name_approved?: boolean }).company_name_approved
    if (!approved && (!emailName || !isCompanyNameClean(emailName))) {
      skipped++
      continue
    }

    // Subject for this recipient = their assigned A/B bucket (stable, set at
    // add-time), with {company} interpolated from the email business name.
    const rawSubject = ((r as { subject_variant?: string | null }).subject_variant === 'B' && subjectB ? subjectB : subjectA)
      .replace(/\{company\}/gi, emailName)

    const rendered = renderCommercialIntro({
      lead: { company: emailName, contact_name: lead.contact_name, email: lead.email },
      token: r.token,
      siteUrl: siteUrl(),
      subject: rawSubject,
      sender: {
        name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
        email: campaign.reply_to || (campaign as { from_email?: string | null }).from_email || null,
        bannerUrl: (campaign as { signature_banner_url?: string | null }).signature_banner_url || null,
      },
    })
    const fromEmail = (campaign as { from_email?: string | null }).from_email || 'noreply@sano.nz'

    const { data: sendData, error: sendErr } = await resend.emails.send({
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
      // Record exactly what was sent (audit): subject, variant, from-address, and
      // BOTH the rendered HTML and plain-text. Capture the Message-ID for threading
      // the follow-up. delivered_at set on send success (webhooks refine later);
      // follow-up uses delivered, not opens.
      const nowIso = new Date().toISOString()
      await supabase.from('sales_campaign_recipients').update({
        status: 'sent', sent_at: nowIso, delivered_at: nowIso, error: null,
        sent_subject: rendered.subject, sent_variant: rendered.variant, sent_from: fromEmail,
        sent_body: rendered.html, sent_text: rendered.text,
        message_id: (sendData as { id?: string } | null)?.id ?? null,
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

/**
 * Send ONE follow-up to eligible recipients, up to `limit`. Eligibility (strict,
 * per spec — never uses open status):
 *   • intro delivered (delivered_at set, no bounce)
 *   • no reply (responded_at null)
 *   • lead not opted out / do_not_contact
 *   • no follow-up already sent (followup_sent_at null)
 *   • ~5 business days since the intro was sent
 * Same named/team split + assigned subject bucket (threaded as "Re:").
 */
export async function sendFollowupBatch(
  supabase: SupabaseClient,
  campaignId: string,
  opts: { limit: number; now?: Date },
): Promise<{ result?: SendBatchResult; error?: string }> {
  const now = opts.now ?? new Date()

  const { data: campaign, error: cErr } = await supabase
    .from('sales_campaigns')
    .select('id, from_name, from_email, signature_name, signature_banner_url, reply_to')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }

  const { data: rowsRaw, error: rErr } = await supabase
    .from('sales_campaign_recipients')
    .select('id, token, sent_at, sent_subject, message_id, delivered_at, bounced_at, responded_at, followup_sent_at, lead:sales_leads(id, company, email_business_name, contact_name, email, status, unsubscribed_at)')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .is('responded_at', null)
    .is('followup_sent_at', null)
    .is('bounced_at', null)
    .not('delivered_at', 'is', null)
  if (rErr) return { error: `Failed to load follow-up candidates: ${rErr.message}` }

  const candidates = (rowsRaw ?? [])
    .map((r) => ({ ...r, lead: Array.isArray(r.lead) ? r.lead[0] : r.lead }))
    .filter((r) => r.lead && r.lead.email && !r.lead.unsubscribed_at && r.lead.status !== 'do_not_contact')
    // ~5 business days since the intro.
    .filter((r) => r.sent_at && businessDaysBetween(r.sent_at as string, now) >= 5)

  const batch = candidates.slice(0, Math.max(0, opts.limit))
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0, failed = 0

  for (const r of batch) {
    const lead = r.lead

    // Belt-and-braces: re-read THIS recipient immediately before sending, so a
    // reply / opt-out / bounce / already-sent that landed since the batch query
    // still stops the follow-up (no stale-list nudge).
    const { data: fresh } = await supabase
      .from('sales_campaign_recipients')
      .select('responded_at, followup_sent_at, bounced_at, lead:sales_leads(status, unsubscribed_at)')
      .eq('id', r.id)
      .single()
    const freshLead = fresh ? (Array.isArray(fresh.lead) ? fresh.lead[0] : fresh.lead) : null
    if (!fresh || fresh.responded_at || fresh.followup_sent_at || fresh.bounced_at
      || !freshLead || freshLead.unsubscribed_at || freshLead.status === 'do_not_contact') {
      continue
    }

    const followupName = (lead.email_business_name ?? '').trim() || lead.company
    const rendered = renderCommercialFollowup({
      lead: { company: followupName, contact_name: lead.contact_name, email: lead.email },
      token: r.token,
      siteUrl: siteUrl(),
      originalSubject: (r.sent_subject as string) || `Cleaning at ${followupName}`,
      sender: {
        name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
        email: campaign.reply_to || (campaign as { from_email?: string | null }).from_email || null,
        bannerUrl: (campaign as { signature_banner_url?: string | null }).signature_banner_url || null,
      },
    })
    const fromEmail = (campaign as { from_email?: string | null }).from_email || 'noreply@sano.nz'

    // Thread under the original: In-Reply-To + References point at the intro's
    // Message-ID (Resend builds the RFC id as <{id}@…>; use the stored id).
    const originalMsgId = (r as { message_id?: string | null }).message_id
    const threadHeaders: Record<string, string> = originalMsgId
      ? { 'In-Reply-To': `<${originalMsgId}>`, 'References': `<${originalMsgId}>` }
      : {}

    const { error: sendErr } = await resend.emails.send({
      from: `${campaign.from_name} <${fromEmail}>`,
      to: lead.email,
      replyTo: campaign.reply_to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: { ...listUnsubscribeHeader(campaign.reply_to), ...threadHeaders },
    })

    if (sendErr) { failed++; continue }
    await supabase.from('sales_campaign_recipients').update({
      followup_sent_at: new Date().toISOString(),
      followup_subject: rendered.subject,
      followup_variant: rendered.variant,
    }).eq('id', r.id)
    sent++
  }

  return { result: { sent, failed, skipped: 0, remaining: candidates.length - sent - failed } }
}
