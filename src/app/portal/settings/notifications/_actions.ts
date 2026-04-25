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
//
// Switched to a FormData-based signature so the panel uses
// React's `<form action={sendTestSms}>` + `useFormState` pattern.
// Progressive-enhancement: works without JS, and avoids the
// "click does nothing" failure mode where an onClick handler
// silently never fires (hydration mismatch, stripped event
// handler, etc.).
//
// Returns shape compatible with React's useFormState:
//   { ok?: true; logId?: string; error?: string; sentTo?: string }

export interface TestSmsState {
  ok?: true
  logId?: string
  sentTo?: string
  error?: string
}

export async function sendTestSms(
  _prev: TestSmsState | undefined,
  formData: FormData,
): Promise<TestSmsState> {
  const to   = String(formData.get('phone')   ?? '').trim()
  const body = String(formData.get('message') ?? '').trim()

  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }

  if (!to)   return { error: 'Phone number is required.' }
  if (!body) return { error: 'Message body is required.' }

  const result = await sendNotification(auth.supabase, {
    type: 'job_assigned' as const,    // arbitrary — bypassed by source:'test'
    channel: 'sms',
    audience: 'staff',
    source: 'test',
    recipientName: 'Admin test',
    recipientPhone: to,
    variables: {},
    testBody: body,
  })

  if (result.status === 'sent') {
    revalidatePath('/portal/settings/notifications')
    return { ok: true, logId: result.logId, sentTo: to }
  }
  return { error: result.reason ?? `Test send ${result.status}.` }
}
