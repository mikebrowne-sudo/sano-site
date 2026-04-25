'use server'

// Phase H — notification settings + template + test-SMS actions.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'
import {
  validateNotificationSettings,
  type NotificationSettings,
  SETTINGS_KEY as NOTIFICATION_SETTINGS_KEY,
} from '@/lib/notifications/settings'
import { sendNotification } from '@/lib/notifications/send'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return { error: 'Admin only.' as const, supabase, user: null as null }
  }
  return { ok: true as const, supabase, user, userId: user.id }
}

// ── Save settings ───────────────────────────────────────────────

export async function saveNotificationSettings(input: unknown):
  Promise<{ ok: true; settings: NotificationSettings } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }

  const validated = validateNotificationSettings(input)
  if ('error' in validated) return { error: validated.error }

  const { error } = await auth.supabase
    .from('notification_settings')
    .upsert(
      {
        key: NOTIFICATION_SETTINGS_KEY,
        value: validated.value as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: 'key' },
    )
  if (error) return { error: `Failed to save settings: ${error.message}` }

  revalidatePath('/portal/settings/notifications')
  return { ok: true, settings: validated.value }
}

// ── Save template ───────────────────────────────────────────────

export interface SaveTemplateInput {
  type: string
  channel: 'sms' | 'email'
  audience: 'contractor' | 'customer' | 'staff'
  body: string
  enabled: boolean
}

export async function saveNotificationTemplate(input: SaveTemplateInput):
  Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }

  if (!input.type || !input.channel || !input.audience) {
    return { error: 'type, channel, and audience are required.' }
  }
  if (!input.body || !input.body.trim()) {
    return { error: 'Template body cannot be empty.' }
  }

  const { error } = await auth.supabase
    .from('notification_templates')
    .upsert(
      {
        type: input.type,
        channel: input.channel,
        audience: input.audience,
        body: input.body,
        enabled: input.enabled,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: 'type,channel,audience' },
    )
  if (error) return { error: `Failed to save template: ${error.message}` }

  revalidatePath('/portal/settings/notifications')
  return { ok: true }
}

// ── Test SMS ────────────────────────────────────────────────────

export interface SendTestSmsInput {
  to: string
  body: string
}

export async function sendTestSms(input: SendTestSmsInput):
  Promise<{ ok: true; logId?: string } | { error: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }

  if (!input.to.trim())   return { error: 'Phone number is required.' }
  if (!input.body.trim()) return { error: 'Message body is required.' }

  const result = await sendNotification(auth.supabase, {
    type: 'job_assigned' as const,    // arbitrary — bypassed by source:'test'
    channel: 'sms',
    audience: 'staff',
    source: 'test',
    recipientName: 'Admin test',
    recipientPhone: input.to,
    variables: {},
    testBody: input.body,
  })

  if (result.status === 'sent') {
    revalidatePath('/portal/settings/notifications')
    return { ok: true, logId: result.logId }
  }
  return { error: result.reason ?? `Test send ${result.status}.` }
}
