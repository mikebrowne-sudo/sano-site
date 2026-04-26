// Phase H — high-level sendNotification.
//
// Single entry point used by manual job actions, the auto-send path
// in assignJob, and the test SMS panel. Applies the gating rules
// from the brief in order:
//
//   1. Provider configured (Twilio env vars)
//   2. SMS enabled globally
//   3. Audience channel enabled (contractor_sms_enabled / customer_sms_enabled)
//   4. Notification type enabled
//   5. Manual / automated channel enabled (per source)
//   6. Template exists + enabled
//   7. Recipient phone number present
//
// Every attempt — sent, failed, or skipped — writes a
// notification_logs row. Skipped sends include the reason in
// error_message so the operator can see why nothing went out.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isTypeEnabled,
  loadNotificationSettings,
} from './settings'
import { renderTemplate, type TemplateVariables } from './render-template'
import { isTwilioConfigured, sendTwilioSms } from './twilio'
import type { NotificationAudience, NotificationType } from './types'

export interface SendNotificationInput {
  type: NotificationType
  channel: 'sms'      // email is reserved for future expansion
  audience: NotificationAudience
  /** 'manual' = staff/admin clicked Send. 'automated' = triggered
   *  by a workflow event (e.g. Assign + Notify). 'test' = bypasses
   *  the type/channel gates so the test SMS panel always tries to
   *  send when SMS is configured. */
  source: 'manual' | 'automated' | 'test'
  recipientName?: string | null
  recipientPhone: string | null
  variables: TemplateVariables
  /** Foreign keys for the log row. All optional. */
  jobId?: string | null
  clientId?: string | null
  contractorId?: string | null
  invoiceId?: string | null
  /** When `source: 'test'`, callers can pass an explicit body to
   *  bypass the templates table (used by the admin test panel). */
  testBody?: string
}

export interface SendNotificationResult {
  status: 'sent' | 'failed' | 'skipped'
  reason?: string
  messageId?: string
  logId?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

async function writeLog(
  supabase: SB,
  input: SendNotificationInput,
  body: string | null,
  status: 'sent' | 'failed' | 'skipped',
  details: { providerMessageId?: string; errorMessage?: string },
): Promise<string | undefined> {
  const { data } = await supabase
    .from('notification_logs')
    .insert({
      type: input.type,
      channel: input.channel,
      audience: input.audience,
      recipient_name: input.recipientName ?? null,
      recipient_phone: input.recipientPhone ?? null,
      recipient_email: null,
      status,
      provider: input.channel === 'sms' ? 'twilio' : null,
      provider_message_id: details.providerMessageId ?? null,
      error_message: details.errorMessage ?? null,
      payload: {
        body,
        variables: input.variables,
        source: input.source,
      } as unknown as Record<string, unknown>,
      related_job_id: input.jobId ?? null,
      related_client_id: input.clientId ?? null,
      related_contractor_id: input.contractorId ?? null,
      related_invoice_id: input.invoiceId ?? null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  return (data?.id as string | undefined) ?? undefined
}

export async function sendNotification(
  supabase: SB,
  input: SendNotificationInput,
): Promise<SendNotificationResult> {
  // Test sends bypass type / channel toggles but still need provider
  // config + a recipient phone.
  const isTest = input.source === 'test'

  // 1. Provider configured.
  if (input.channel === 'sms' && !isTwilioConfigured()) {
    const id = await writeLog(supabase, input, null, 'skipped',
      { errorMessage: 'Twilio not configured (env vars missing).' })
    return { status: 'skipped', reason: 'Twilio not configured.', logId: id }
  }

  // Settings (skip the read for tests if you wanted maximum speed —
  // in practice it's a tiny query and we want the same gates for
  // automated sends, so always read).
  const settings = await loadNotificationSettings(supabase)

  if (input.channel === 'sms' && !settings.provider.sms_enabled && !isTest) {
    const id = await writeLog(supabase, input, null, 'skipped',
      { errorMessage: 'SMS disabled globally in notification settings.' })
    return { status: 'skipped', reason: 'SMS disabled globally.', logId: id }
  }

  // 3. Channel toggle.
  if (!isTest && input.channel === 'sms') {
    if (input.audience === 'contractor' && !settings.channels.contractor_sms_enabled) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: 'Contractor SMS disabled in notification settings.' })
      return { status: 'skipped', reason: 'Contractor SMS disabled.', logId: id }
    }
    if (input.audience === 'customer' && !settings.channels.customer_sms_enabled) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: 'Customer SMS disabled in notification settings.' })
      return { status: 'skipped', reason: 'Customer SMS disabled.', logId: id }
    }
  }

  // 4. Type toggle (skip for tests).
  if (!isTest && (input.audience === 'contractor' || input.audience === 'customer')) {
    if (!isTypeEnabled(settings, input.audience, input.type)) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: `Notification type "${input.audience}.${input.type}" disabled in settings.` })
      return { status: 'skipped', reason: 'Type disabled.', logId: id }
    }
  }

  // 5. Manual / automated source gate.
  if (!isTest) {
    if (input.source === 'manual' && !settings.channels.manual_enabled) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: 'Manual notifications disabled in settings.' })
      return { status: 'skipped', reason: 'Manual notifications disabled.', logId: id }
    }
    if (input.source === 'automated' && !settings.channels.automated_enabled) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: 'Automated notifications disabled in settings.' })
      return { status: 'skipped', reason: 'Automated notifications disabled.', logId: id }
    }
  }

  // 6. Template — skipped for tests when testBody is supplied.
  let body: string
  if (isTest && input.testBody) {
    body = input.testBody
  } else {
    const { data: tpl } = await supabase
      .from('notification_templates')
      .select('body, enabled')
      .eq('type', input.type)
      .eq('channel', input.channel)
      .eq('audience', input.audience)
      .maybeSingle()
    if (!tpl) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: `No template for ${input.audience}.${input.type} (${input.channel}).` })
      return { status: 'skipped', reason: 'Template missing.', logId: id }
    }
    if (tpl.enabled === false) {
      const id = await writeLog(supabase, input, null, 'skipped',
        { errorMessage: 'Template disabled.' })
      return { status: 'skipped', reason: 'Template disabled.', logId: id }
    }
    const rendered = renderTemplate(tpl.body as string, input.variables)
    body = rendered.body
  }

  // 7. Recipient.
  if (!input.recipientPhone || !input.recipientPhone.trim()) {
    const id = await writeLog(supabase, input, body, 'skipped',
      { errorMessage: 'Recipient phone number missing.' })
    return { status: 'skipped', reason: 'Recipient phone missing.', logId: id }
  }

  // 8. Customer opt-out (STOP keyword honoured). Phase H.5.
  //    Twilio Messaging Services already block at the carrier level
  //    after STOP, but we re-check here so:
  //      - manual / ad-hoc sends from staff also respect the opt-out
  //      - the skip is captured in notification_logs with a clear
  //        reason rather than a Twilio-side silent drop
  //    Lookup uses clientId when present (direct PK lookup); falls
  //    back to phone match. Contractor sends are not gated here.
  if (!isTest && input.audience === 'customer') {
    let isOptedOut = false
    if (input.clientId) {
      const { data } = await supabase
        .from('clients')
        .select('opted_out_sms')
        .eq('id', input.clientId)
        .maybeSingle()
      isOptedOut = (data as { opted_out_sms?: boolean } | null)?.opted_out_sms === true
    } else if (input.recipientPhone) {
      const { data } = await supabase
        .from('clients')
        .select('opted_out_sms')
        .eq('phone', input.recipientPhone)
        .limit(1)
      isOptedOut = (data?.[0] as { opted_out_sms?: boolean } | undefined)?.opted_out_sms === true
    }
    if (isOptedOut) {
      const id = await writeLog(supabase, input, body, 'skipped',
        { errorMessage: 'Client opted out (STOP).' })
      return { status: 'skipped', reason: 'Client opted out.', logId: id }
    }
  }

  // ── Send ──
  const result = await sendTwilioSms({ to: input.recipientPhone, body })
  if (result.ok) {
    const id = await writeLog(supabase, input, body, 'sent',
      { providerMessageId: result.message_id })
    return { status: 'sent', messageId: result.message_id, logId: id }
  }
  const id = await writeLog(supabase, input, body, 'failed',
    { errorMessage: result.error })
  return { status: 'failed', reason: result.error, logId: id }
}
