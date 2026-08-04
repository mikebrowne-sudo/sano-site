'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { renderCommercialIntro, listUnsubscribeHeader } from '@/lib/campaigns/template'

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
    .select('id, name, subject, from_name, from_email, signature_name, signature_banner_url, reply_to, status')
    .eq('id', campaignId)
    .single()
  if (cErr || !campaign) return { error: 'Campaign not found.' }
  if (campaign.status === 'sending') return { error: 'Campaign is already sending.' }

  const { data: recipients, error: rErr } = await supabase
    .from('sales_campaign_recipients')
    .select('id, token, status, lead:sales_leads(id, company, contact_name, email, status, unsubscribed_at)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
  if (rErr) return { error: `Failed to load recipients: ${rErr.message}` }
  if (!recipients || recipients.length === 0) return { error: 'No pending recipients.' }

  await supabase.from('sales_campaigns').update({ status: 'sending' }).eq('id', campaignId)

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const r of recipients) {
    // Supabase join can type as array; normalise.
    const lead = Array.isArray(r.lead) ? r.lead[0] : r.lead
    if (!lead || !lead.email || lead.unsubscribed_at || lead.status === 'do_not_contact') {
      await supabase
        .from('sales_campaign_recipients')
        .update({ status: 'skipped', error: 'No email or opted out' })
        .eq('id', r.id)
      skipped++
      continue
    }

    const rendered = renderCommercialIntro({
      lead: { company: lead.company, contact_name: lead.contact_name },
      token: r.token,
      siteUrl: siteUrl(),
      subject: campaign.subject,
      // Signature = the campaign's signature name (falls back to from_name),
      // with the banner image when set.
      sender: {
        name: (campaign as { signature_name?: string | null }).signature_name || campaign.from_name,
        bannerUrl: (campaign as { signature_banner_url?: string | null }).signature_banner_url || null,
      },
    })

    // From-address: the campaign's from_email (e.g. carol@sano.nz) or the safe
    // default. The domain must be verified in Resend or the send will bounce.
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
      await supabase
        .from('sales_campaign_recipients')
        .update({ status: 'failed', error: sendErr.message })
        .eq('id', r.id)
      failed++
    } else {
      await supabase
        .from('sales_campaign_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', r.id)
      // First touch moves a fresh lead to `contacted`.
      await supabase
        .from('sales_leads')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', lead.id)
        .eq('status', 'new')
      sent++
    }
  }

  await supabase
    .from('sales_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath(`/portal/campaigns/${campaignId}`)
  revalidatePath('/portal/campaigns')
  revalidatePath('/portal/leads')
  return { success: true, sent, failed, skipped }
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
