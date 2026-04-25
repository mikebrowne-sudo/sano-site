// Phase H — notification settings (singleton key='default').
//
// Mirrors the proposal_settings + job_settings pattern: load merges
// stored JSONB over hard-coded defaults so missing rows / unknown
// keys / malformed JSON never throw.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from './types'

// ── Types ──────────────────────────────────────────────────────────

export interface NotificationProviderSettings {
  /** When false, the gating short-circuits before Twilio is called. */
  sms_enabled: boolean
  /** Future-proofing: only 'twilio' for now. */
  sms_provider: 'twilio'
}

export interface NotificationChannelSettings {
  contractor_sms_enabled: boolean
  customer_sms_enabled: boolean
  /** Email channel exists for contractor assignment via Resend; this
   *  switch controls whether NEW notification types route through
   *  the same logger. The legacy notifyContractorAssigned email
   *  always sends regardless. */
  email_enabled: boolean
  /** Manual sends are always allowed when individual gates pass.
   *  This switch exists so the operator can disable manual sends
   *  during quiet hours / holidays. */
  manual_enabled: boolean
  /** When false, automated triggers (e.g. on Assign + Notify)
   *  short-circuit. Manual sends still work. */
  automated_enabled: boolean
}

/** Per notification-type enable flag. Stored as a flat key-value
 *  object keyed by `${audience}.${type}` so additions don't require
 *  a schema change. */
export type NotificationTypeSettings = Record<string, boolean>

export interface NotificationSettings {
  provider: NotificationProviderSettings
  channels: NotificationChannelSettings
  /** Map of `${audience}.${type}` → enabled. Missing entries fall
   *  back to `true` so a freshly-added type doesn't silently lock. */
  types: NotificationTypeSettings
}

// ── Defaults ───────────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  provider: {
    sms_enabled: false, // Off until Twilio creds configured + tested.
    sms_provider: 'twilio',
  },
  channels: {
    contractor_sms_enabled: false,
    customer_sms_enabled:   false,
    email_enabled:          true,  // existing assignment email keeps working
    manual_enabled:         true,
    automated_enabled:      true,
  },
  types: {
    'contractor.job_assigned':            true,
    'contractor.job_reminder_day_before': true,
    'contractor.job_updated':             true,
    'contractor.job_cancelled':           true,
    'customer.booking_confirmation':      true,
    'customer.job_reminder_day_before':   true,
    'customer.cleaner_on_the_way':        true,
    'customer.job_completed':             true,
    'customer.invoice_sent':              true,
    'customer.payment_reminder':          true,
  },
}

// ── Validators ─────────────────────────────────────────────────────

function safeBool(input: unknown, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback
}

function mergeProvider(input: unknown, fb: NotificationProviderSettings): NotificationProviderSettings {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    sms_enabled:  safeBool(s.sms_enabled, fb.sms_enabled),
    sms_provider: 'twilio',
  }
}

function mergeChannels(input: unknown, fb: NotificationChannelSettings): NotificationChannelSettings {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    contractor_sms_enabled: safeBool(s.contractor_sms_enabled, fb.contractor_sms_enabled),
    customer_sms_enabled:   safeBool(s.customer_sms_enabled,   fb.customer_sms_enabled),
    email_enabled:          safeBool(s.email_enabled,          fb.email_enabled),
    manual_enabled:         safeBool(s.manual_enabled,         fb.manual_enabled),
    automated_enabled:      safeBool(s.automated_enabled,      fb.automated_enabled),
  }
}

function mergeTypes(input: unknown, fb: NotificationTypeSettings): NotificationTypeSettings {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  const out: NotificationTypeSettings = { ...fb }
  for (const k of Object.keys(s)) {
    if (typeof s[k] === 'boolean') out[k] = s[k] as boolean
  }
  return out
}

export function mergeNotificationSettings(stored: unknown): NotificationSettings {
  const s = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {}
  return {
    provider: mergeProvider(s.provider, DEFAULT_NOTIFICATION_SETTINGS.provider),
    channels: mergeChannels(s.channels, DEFAULT_NOTIFICATION_SETTINGS.channels),
    types:    mergeTypes(s.types,       DEFAULT_NOTIFICATION_SETTINGS.types),
  }
}

export function validateNotificationSettings(input: unknown):
  | { ok: true; value: NotificationSettings }
  | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Settings payload must be an object.' }
  }
  return { ok: true, value: mergeNotificationSettings(input) }
}

// ── Loader ─────────────────────────────────────────────────────────

const SETTINGS_KEY = 'default'

export async function loadNotificationSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public'>,
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error || !data) return DEFAULT_NOTIFICATION_SETTINGS
  return mergeNotificationSettings(data.value)
}

/** True when the operator has enabled the type for the audience. */
export function isTypeEnabled(
  settings: NotificationSettings,
  audience: 'contractor' | 'customer',
  type: NotificationType,
): boolean {
  const key = `${audience}.${type}`
  return settings.types[key] !== false
}

export { SETTINGS_KEY }
