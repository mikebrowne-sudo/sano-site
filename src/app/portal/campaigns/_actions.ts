'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { renderCommercialIntro, listUnsubscribeHeader } from '@/lib/campaigns/template'
import { sendCampaignBatch } from '@/lib/campaigns/send-batch'
import { checkSenderReadiness } from '@/lib/campaigns/sender-readiness'
import { isAdminUser } from '@/lib/is-admin'
import { reviewCompanyName } from '@/lib/campaigns/company-name-quality'
import type { SupabaseClient } from '@supabase/supabase-js'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
}

export async function createCampaignAction(input: {
  name: string
  subject: string
  subjectA?: string
  subjectB?: string
  description?: string
  fromName?: string
  fromEmail?: string
  signatureName?: string
  signatureBannerUrl?: string
  replyTo?: string
  dailySendCap?: number
  leadIds: string[]
}) {
  if (!input.name.trim()) return { error: 'Campaign needs a name.' }
  if (input.leadIds.length === 0) return { error: 'Pick at least one lead.' }

  const supabase = createClient()
  const subjectA = input.subjectA?.trim() || input.subject.trim() || 'Cleaning at {company}'
  const subjectB = input.subjectB?.trim() || null

  const { data: campaign, error } = await supabase
    .from('sales_campaigns')
    .insert({
      name: input.name.trim(),
      subject: subjectA,
      subject_a: subjectA,
      subject_b: subjectB,
      description: input.description || null,
      // Sender identity (columns default sensibly when omitted).
      ...(input.fromName?.trim() ? { from_name: input.fromName.trim() } : {}),
      ...(input.fromEmail?.trim() ? { from_email: input.fromEmail.trim() } : {}),
      ...(input.signatureName?.trim() ? { signature_name: input.signatureName.trim() } : {}),
      ...(input.signatureBannerUrl?.trim() ? { signature_banner_url: input.signatureBannerUrl.trim() } : {}),
      ...(typeof input.dailySendCap === 'number' ? { daily_send_cap: Math.max(0, Math.floor(input.dailySendCap)) } : {}),
      ...(input.replyTo?.trim() ? { reply_to: input.replyTo.trim() } : {}),
    })
    .select('id')
    .single()

  if (error || !campaign) {
    return { error: `Failed to create campaign: ${error?.message}` }
  }

  // Assign the A/B subject bucket evenly + randomly at add-time (never changed
  // after sending). When there's no B subject, everyone is 'A'. Even split via a
  // shuffled index so quality isn't correlated with the bucket.
  const ids = [...input.leadIds]
  if (subjectB) {
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[ids[i], ids[j]] = [ids[j], ids[i]] }
  }
  const rows = ids.map((lead_id, idx) => ({
    campaign_id: campaign.id,
    lead_id,
    subject_variant: subjectB ? (idx % 2 === 0 ? 'A' : 'B') : 'A',
  }))
  const { error: recErr } = await supabase.from('sales_campaign_recipients').insert(rows)
  if (recErr) {
    return { error: `Campaign created but recipients failed: ${recErr.message}` }
  }

  redirect(`/portal/campaigns/${campaign.id}`)
}

/**
 * Send a campaign. Sequential sends via Resend (well inside rate limits at
 * this volume). Fail-soft per recipient: a failed send marks that row
 * `failed` and continues; leads that unsubscribed / lost their email since
 * being added are marked `skipped`.
 */
export async function sendCampaignAction(campaignId: string, opts?: { overrideReadiness?: boolean }) {
  const supabase = createClient()

  const { data: campaign, error: cErr } = await supabase
    .from('sales_campaigns')
    .select('id, status, daily_send_cap, from_email')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }
  if (campaign.status === 'sending') return { error: 'Campaign is already sending.' }

  // Sender-readiness gate: block launch if the sending domain isn't
  // SPF/DKIM-verified + aligned, unless explicitly overridden.
  if (!opts?.overrideReadiness) {
    const readiness = await checkSenderReadiness((campaign as { from_email?: string | null }).from_email || 'noreply@sano.nz')
    if (!readiness.ready) {
      return { error: `Sender not verified: ${readiness.checks.find((c) => !c.ok)?.detail ?? 'authentication unconfirmed'}. Fix DNS/verification or override to send anyway.`, blockedByReadiness: true }
    }
  }

  // Company-name quality gate: the intro interpolates each lead's company into
  // the subject + body, so a flagged/unsafe name (research note, contact name,
  // email, junk) would go out looking like a broken mail-merge. Block launch
  // while ANY pending recipient has a flagged name that hasn't been explicitly
  // approved. Correcting the lead, excluding the recipient, or approving the row
  // clears it. Not overridable by the readiness flag — this is its own gate.
  const nameReview = await reviewCampaignCompanyNames(supabase, campaignId)
  if (nameReview.blocking > 0) {
    return {
      error: `${nameReview.blocking} recipient${nameReview.blocking === 1 ? ' has a' : 's have'} company name flagged as unsafe to send. Fix, exclude, or approve each flagged name below before launching.`,
      blockedByNames: true,
      flaggedCount: nameReview.blocking,
    }
  }

  // A daily cap (e.g. 15) sends only today's batch and leaves the rest pending
  // for the daily drip cron. No cap = send everything now.
  const cap = Number((campaign as { daily_send_cap?: number | null }).daily_send_cap ?? 0)
  const limit = cap > 0 ? cap : Infinity

  await supabase.from('sales_campaigns').update({ status: 'sending' }).eq('id', campaignId)

  const { result, error } = await sendCampaignBatch(supabase, campaignId, { limit })
  if (error) {
    await supabase.from('sales_campaigns').update({ status: 'draft' }).eq('id', campaignId)
    return { error }
  }

  // Drip campaigns with more still pending stay 'sending' (the cron continues);
  // otherwise the campaign is fully sent.
  const done = (result?.remaining ?? 0) <= 0
  await supabase
    .from('sales_campaigns')
    .update(done ? { status: 'sent', sent_at: new Date().toISOString() } : { status: 'sending', last_batch_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath(`/portal/campaigns/${campaignId}`)
  revalidatePath('/portal/campaigns')
  revalidatePath('/portal/leads')
  return { success: true, sent: result?.sent ?? 0, failed: result?.failed ?? 0, skipped: result?.skipped ?? 0, remaining: result?.remaining ?? 0 }
}

/** Manual response marking (reply detection is manual by design for now). */
export async function markRespondedAction(recipientId: string) {
  const supabase = createClient()

  const { data: rec, error } = await supabase
    .from('sales_campaign_recipients')
    .update({ responded_at: new Date().toISOString() })
    .eq('id', recipientId)
    .select('lead_id, campaign_id')
    .single()
  if (error || !rec) return { error: `Failed to mark responded: ${error?.message}` }

  await supabase
    .from('sales_leads')
    .update({ status: 'responded', updated_at: new Date().toISOString() })
    .eq('id', rec.lead_id)
    .in('status', ['new', 'contacted'])

  await supabase.from('sales_lead_activities').insert({
    lead_id: rec.lead_id,
    kind: 'email',
    body: 'Replied to campaign email',
  })

  revalidatePath(`/portal/campaigns/${rec.campaign_id}`)
  revalidatePath(`/portal/leads/${rec.lead_id}`)
  return { success: true }
}

/**
 * Mark a recipient as opted out. Immediately suppresses the lead from ALL future
 * commercial campaigns: sets the lead to do_not_contact + unsubscribed_at, which
 * every send path (sendCampaignBatch / sendFollowupBatch) skips. Also stamps
 * responded_at so this campaign's follow-up won't fire either.
 */
export async function markOptedOutAction(recipientId: string) {
  const supabase = createClient()

  const nowIso = new Date().toISOString()
  const { data: rec, error } = await supabase
    .from('sales_campaign_recipients')
    .update({ responded_at: nowIso })
    .eq('id', recipientId)
    .select('lead_id, campaign_id')
    .single()
  if (error || !rec) return { error: `Failed to mark opted out: ${error?.message}` }

  await supabase
    .from('sales_leads')
    .update({ status: 'do_not_contact', unsubscribed_at: nowIso, updated_at: nowIso })
    .eq('id', rec.lead_id)

  await supabase.from('sales_lead_activities').insert({
    lead_id: rec.lead_id,
    kind: 'email',
    body: 'Opted out of campaign email — suppressed from future campaigns',
  })

  revalidatePath(`/portal/campaigns/${rec.campaign_id}`)
  revalidatePath(`/portal/leads/${rec.lead_id}`)
  return { success: true }
}

/**
 * Send ONE test email to a chosen address, rendered exactly as the campaign will
 * send it (sender identity + signature), using a sample company. Never touches a
 * lead or the recipient list — for verifying deliverability + how it looks.
 */
export async function sendTestEmailAction(input: { campaignId: string; to: string }): Promise<{ ok?: true; error?: string }> {
  const to = input.to?.trim()
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { error: 'Enter a valid email address to test to.' }

  const supabase = createClient()
  const { data: campaign, error } = await supabase
    .from('sales_campaigns')
    .select('subject, from_name, from_email, signature_name, signature_banner_url, reply_to')
    .eq('id', input.campaignId)
    .single()
  if (error || !campaign) return { error: 'Campaign not found.' }

  // Render exactly as a real send would: a sample company, {company} interpolated
  // into the subject (the real send does this in send-batch — the test must match
  // or {company} shows literally), a named greeting so you see the "Hi <name>,"
  // variant, and the banner defaulting to Carol's if the campaign has one.
  const sampleCompany = 'Acme Property Group'
  const rendered = renderCommercialIntro({
    lead: { company: sampleCompany, contact_name: 'Jane Smith' },
    token: 'test-preview', // harmless — tracking endpoints ignore unknown tokens
    siteUrl: siteUrl(),
    subject: (campaign.subject || 'Cleaning at {company}').replace(/\{company\}/gi, sampleCompany),
    sender: {
      name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
      email: campaign.reply_to || (campaign as { from_email?: string | null }).from_email || null,
      bannerUrl:
        (campaign as { signature_banner_url?: string | null }).signature_banner_url ||
        'https://sano.nz/email/email-banner-carol.jpg',
    },
  })
  const fromEmail = (campaign as { from_email?: string | null }).from_email || 'noreply@sano.nz'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendErr } = await resend.emails.send({
    from: `${campaign.from_name} <${fromEmail}>`,
    to,
    replyTo: campaign.reply_to,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    headers: listUnsubscribeHeader(campaign.reply_to),
  })
  if (sendErr) return { error: `Test send failed: ${sendErr.message}` }
  return { ok: true }
}

/**
 * Delete a campaign (admin only — Michael or Carol). Recipients cascade-delete
 * via the FK. To avoid nuking real send history by accident, a campaign that has
 * actually sent email is blocked unless `force: true` is passed (the UI asks a
 * second, sterner confirmation for those). Draft / test campaigns delete freely.
 */
export async function deleteCampaignAction(campaignId: string, opts?: { force?: boolean }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: campaign, error: cErr } = await supabase
    .from('sales_campaigns')
    .select('id, name, status')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }

  // How many recipients were actually emailed? A campaign with real sends is
  // protected behind the force flag so test/draft cleanup can't wipe live history.
  const { count: sentCount } = await supabase
    .from('sales_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .not('sent_at', 'is', null)

  if ((sentCount ?? 0) > 0 && !opts?.force) {
    return { error: `This campaign has already emailed ${sentCount} recipient${sentCount === 1 ? '' : 's'}. Deleting removes that send history. Confirm again to force-delete.`, needsForce: true }
  }

  const { error: delErr } = await supabase.from('sales_campaigns').delete().eq('id', campaignId)
  if (delErr) return { error: `Delete failed: ${delErr.message}` }

  revalidatePath('/portal/campaigns')
  return { success: true }
}

// ── Company-name review (pre-launch safety) ──────────────────────────────────

export interface FlaggedRecipient {
  recipientId: string
  leadId: string
  company: string | null
  issues: string[]
  approved: boolean
}

/**
 * Review the company names of a campaign's PENDING recipients. Returns every
 * flagged recipient (issues + whether it's been approved) and the count of
 * still-blocking rows (flagged AND not approved). Used both by the launch gate
 * and the review UI.
 */
export async function reviewCampaignCompanyNames(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<{ flagged: FlaggedRecipient[]; blocking: number }> {
  const { data: rows } = await supabase
    .from('sales_campaign_recipients')
    .select('id, company_name_approved, lead:sales_leads(id, company)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')

  const flagged: FlaggedRecipient[] = []
  for (const r of rows ?? []) {
    const lead = Array.isArray(r.lead) ? r.lead[0] : r.lead
    const company = (lead?.company as string | null) ?? null
    const issues = reviewCompanyName(company)
    if (issues.length > 0) {
      flagged.push({
        recipientId: r.id as string,
        leadId: (lead?.id as string) ?? '',
        company,
        issues: issues.map((i) => i.detail),
        approved: !!(r as { company_name_approved?: boolean }).company_name_approved,
      })
    }
  }
  const blocking = flagged.filter((f) => !f.approved).length
  return { flagged, blocking }
}

/** Toggle per-campaign automatic follow-ups (defaults OFF; the drip cron only
 *  sends follow-ups when this is explicitly enabled). */
export async function setFollowupsEnabledAction(input: { campaignId: string; enabled: boolean }) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_campaigns')
    .update({ followups_enabled: input.enabled })
    .eq('id', input.campaignId)
  if (error) return { error: `Failed to update follow-up setting: ${error.message}` }
  revalidatePath(`/portal/campaigns/${input.campaignId}`)
  return { success: true }
}

/** Fix a lead's company name in place (clears the flag when the new value is clean). */
export async function fixLeadCompanyNameAction(input: { leadId: string; campaignId: string; company: string }) {
  const supabase = createClient()
  const company = input.company.trim()
  if (!company) return { error: 'Company name cannot be blank.' }

  const { error } = await supabase.from('sales_leads').update({ company, updated_at: new Date().toISOString() }).eq('id', input.leadId)
  if (error) return { error: `Failed to update: ${error.message}` }

  revalidatePath(`/portal/campaigns/${input.campaignId}`)
  return { success: true, stillFlagged: reviewCompanyName(company).length > 0 }
}

/** Explicitly approve a flagged company name for this recipient (name is odd but fine). */
export async function approveRecipientNameAction(input: { recipientId: string; campaignId: string }) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_campaign_recipients')
    .update({ company_name_approved: true })
    .eq('id', input.recipientId)
  if (error) return { error: `Failed to approve: ${error.message}` }
  revalidatePath(`/portal/campaigns/${input.campaignId}`)
  return { success: true }
}

/** Exclude a recipient from the campaign (marks skipped so it never sends). */
export async function excludeRecipientAction(input: { recipientId: string; campaignId: string }) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sales_campaign_recipients')
    .update({ status: 'skipped', error: 'Excluded during company-name review' })
    .eq('id', input.recipientId)
    .eq('status', 'pending')
  if (error) return { error: `Failed to exclude: ${error.message}` }
  revalidatePath(`/portal/campaigns/${input.campaignId}`)
  return { success: true }
}
