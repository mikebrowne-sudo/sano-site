// Phase 5.4 (locked) — Workforce settings loader.
//
// Replaces the earlier `onboarding-settings.ts` and the
// `onboarding_settings` table (renamed to `workforce_settings`).
// Old setting key `block_assignment_until_onboarding_complete` is
// renamed to `block_assignment_until_ready` to match the new
// 4-status model (onboarding → ready → active).
//
// Settings are admin-only writes; staff read. Missing values fall
// back to the code-defined defaults below so the system continues
// to function if the singleton row is deleted.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface WorkforceSettings {
  require_admin_activation_approval: boolean
  block_assignment_until_ready: boolean
  insurance_expiry_warning_days: number
  trial_required_default: boolean
  contractor_required_items: string[]
  employee_required_items: string[]
  // Phase 5.5.3 — feature flag for the contractor portal access surface.
  enable_contractor_portal: boolean
  // Phase 5.5.4 — mobile / PWA toggles for the contractor portal.
  enable_pwa_prompt: boolean
  contractor_mobile_bottom_nav_enabled: boolean
  // Phase 5.5.5 — customer portal scaffold. Default off until the
  // real surface is built; the placeholder page checks this flag.
  enable_customer_portal: boolean
  // Phase 5.5.7 — light email template overrides. Defaults below are
  // used when a key is missing or blank. No UI yet — admins can edit
  // via SQL or a future settings page. Body templates support a few
  // {{tokens}} interpolated by lib/resend.ts (name, link).
  invite_email_subject: string
  invite_email_body_template: string
  reset_email_subject: string
  reset_email_body_template: string
  // Phase 5.5.10 — CRM cleanup feature flags. Defaults all true; turn
  // any of them off to hide the corresponding UI without code changes.
  enable_client_merge: boolean
  enable_client_delete: boolean
  enable_cleanup_dashboard: boolean
}

export const WORKFORCE_SETTINGS_DEFAULTS: WorkforceSettings = {
  require_admin_activation_approval: true,
  block_assignment_until_ready: true,
  insurance_expiry_warning_days: 30,
  trial_required_default: true,
  contractor_required_items: [
    'confirm_details', 'bank_details', 'id_verified',
    'insurance_uploaded', 'contract_signed', 'onboarding_training',
  ],
  employee_required_items: [
    'confirm_details', 'bank_details', 'id_verified',
    'ird_provided', 'kiwisaver', 'contract_signed', 'onboarding_training',
  ],
  enable_contractor_portal: true,
  enable_pwa_prompt: true,
  contractor_mobile_bottom_nav_enabled: true,
  enable_customer_portal: false,
  invite_email_subject: 'You’re invited to the Sano portal',
  invite_email_body_template: 'Hi {{name}},\n\nYou’ve been invited to the Sano portal. Click the link below to set your password and get started.\n\n{{link}}\n\nIf you weren’t expecting this email, you can ignore it.\n\nKind regards,\nThe Sano team',
  reset_email_subject: 'Reset your Sano password',
  reset_email_body_template: 'Hi {{name}},\n\nWe got a request to reset the password on your Sano account. Use the link below to set a new password.\n\n{{link}}\n\nIf you didn’t request this, you can ignore the email — your account is safe.\n\nKind regards,\nThe Sano team',
  enable_client_merge: true,
  enable_client_delete: true,
  enable_cleanup_dashboard: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

export async function loadWorkforceSettings(supabase: SB): Promise<WorkforceSettings> {
  const { data } = await supabase
    .from('workforce_settings')
    .select('value')
    .eq('key', 'default')
    .maybeSingle()

  const raw = (data as { value?: Partial<WorkforceSettings> & { block_assignment_until_onboarding_complete?: boolean } } | null)?.value
  if (!raw || typeof raw !== 'object') return WORKFORCE_SETTINGS_DEFAULTS

  // Tolerate the legacy key during transition.
  const blockUntilReady = typeof raw.block_assignment_until_ready === 'boolean'
    ? raw.block_assignment_until_ready
    : (typeof raw.block_assignment_until_onboarding_complete === 'boolean'
        ? raw.block_assignment_until_onboarding_complete
        : WORKFORCE_SETTINGS_DEFAULTS.block_assignment_until_ready)

  return {
    ...WORKFORCE_SETTINGS_DEFAULTS,
    ...raw,
    block_assignment_until_ready: blockUntilReady,
    contractor_required_items: Array.isArray(raw.contractor_required_items)
      ? raw.contractor_required_items
      : WORKFORCE_SETTINGS_DEFAULTS.contractor_required_items,
    employee_required_items: Array.isArray(raw.employee_required_items)
      ? raw.employee_required_items
      : WORKFORCE_SETTINGS_DEFAULTS.employee_required_items,
  }
}

export function requiredItemsForWorkerType(
  settings: WorkforceSettings,
  workerType: 'contractor' | 'employee',
): string[] {
  return workerType === 'contractor'
    ? settings.contractor_required_items
    : settings.employee_required_items
}
