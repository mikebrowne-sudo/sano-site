'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { renderCommercialIntro, listUnsubscribeHeader } from '@/lib/campaigns/template'
import { sendCampaignBatch } from '@/lib/campaigns/send-batch'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
}

export async function createCampaignAction(input: {
  name: string
  subject: string
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
  const { data: campaign, error } = await supabase
    .from('sales_campaigns')
    .insert({
      name: input.name.trim(),
      subject: input.subject.trim() || 'Cleaning enquiry',
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

  const rows = input.leadIds.map((lead_id) => ({ campaign_id: campaign.id, lead_id }))
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
export async function sendCampaignAction(campaignId: string) {
  const supabase = createClient()

  const { data: campaign, error: cErr } = await supabase
    .from('sales_campaigns')
    .select('id, status, daily_send_cap')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }
  if (campaign.status === 'sending') return { error: 'Campaign is already sending.' }

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

  const rendered = renderCommercialIntro({
    lead: { company: 'Your Company Ltd', contact_name: 'there' },
    token: 'test-preview', // harmless — tracking endpoints ignore unknown tokens
    siteUrl: siteUrl(),
    subject: campaign.subject,
    sender: {
      name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
      bannerUrl: (campaign as { signature_banner_url?: string | null }).signature_banner_url || null,
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
