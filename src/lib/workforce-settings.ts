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
