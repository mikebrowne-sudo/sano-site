// Phase D.2 — operational job settings.
//
// Single key/value/jsonb table (public.job_settings). Singleton row
// with key='default'. Read: staff. Write: admin only (see RLS in the
// Phase D.2 migration).
//
// The loader always returns a fully-populated, validated object —
// missing rows / malformed JSON / unknown keys all fall back to the
// hardcoded defaults. Mirrors the proposal_settings pattern.
//
// NOTE: storing these values does NOT automatically wire them into
// the app's behaviour. Each setting needs a matching consumer (the
// job create actions, the invoice→job auto-create path, etc.). This
// module just owns persistence; consumers read the same loader.

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────

export type JobDefaultPaymentStatus = 'on_account' | 'not_required'
export type ContractorNotificationMethod = 'email'

export interface JobSettings {
  default_payment_status: JobDefaultPaymentStatus
  allow_job_before_payment: boolean
  auto_create_job_on_invoice: boolean
  require_review_before_invoicing: boolean
  contractor_notification_method: ContractorNotificationMethod
}

// ── Defaults ───────────────────────────────────────────────────────

export const DEFAULT_JOB_SETTINGS: JobSettings = {
  default_payment_status: 'on_account',
  allow_job_before_payment: true,
  auto_create_job_on_invoice: false,
  require_review_before_invoicing: false,
  contractor_notification_method: 'email',
}

// ── Validators (minimal, matches the project pattern) ──────────────

function safeBool(input: unknown, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback
}

function safePaymentStatus(
  input: unknown,
  fallback: JobDefaultPaymentStatus,
): JobDefaultPaymentStatus {
  if (input === 'on_account' || input === 'not_required') return input
  return fallback
}

function safeNotificationMethod(
  input: unknown,
  fallback: ContractorNotificationMethod,
): ContractorNotificationMethod {
  if (input === 'email') return input
  return fallback
}

/**
 * Merge stored JSON over defaults with full validation. Always
 * returns a complete JobSettings object. Never throws.
 */
export function mergeJobSettings(stored: unknown): JobSettings {
  const s = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {}
  return {
    default_payment_status:
      safePaymentStatus(s.default_payment_status, DEFAULT_JOB_SETTINGS.default_payment_status),
    allow_job_before_payment:
      safeBool(s.allow_job_before_payment, DEFAULT_JOB_SETTINGS.allow_job_before_payment),
    auto_create_job_on_invoice:
      safeBool(s.auto_create_job_on_invoice, DEFAULT_JOB_SETTINGS.auto_create_job_on_invoice),
    require_review_before_invoicing:
      safeBool(s.require_review_before_invoicing, DEFAULT_JOB_SETTINGS.require_review_before_invoicing),
    contractor_notification_method:
      safeNotificationMethod(s.contractor_notification_method, DEFAULT_JOB_SETTINGS.contractor_notification_method),
  }
}

export function validateJobSettings(input: unknown):
  | { ok: true; value: JobSettings }
  | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Settings payload must be an object.' }
  }
  return { ok: true, value: mergeJobSettings(input) }
}

// ── Loader ─────────────────────────────────────────────────────────

const SETTINGS_KEY = 'default'

export async function loadJobSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public'>,
): Promise<JobSettings> {
  const { data, error } = await supabase
    .from('job_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error || !data) return DEFAULT_JOB_SETTINGS
  return mergeJobSettings(data.value)
}

/**
 * Phase D.3 — convenience wrapper around `loadJobSettings` that
 * creates its own server-side Supabase client. Use this from server
 * actions + server components that just want the current settings
 * without plumbing a client through themselves.
 *
 * Lives alongside loadJobSettings (which still exists for callers
 * that already have a client) so consumers have their pick.
 */
export async function getJobSettings(): Promise<JobSettings> {
  // Dynamic import so this file stays importable from any context
  // without pulling supabase-server into client bundles.
  const { createClient } = await import('./supabase-server')
  return loadJobSettings(createClient())
}

export { SETTINGS_KEY }
