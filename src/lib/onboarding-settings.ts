// Phase 5.4 — Onboarding settings loader.
//
// Loads the JSONB row from public.onboarding_settings (key='default')
// and merges it with code-defined defaults so missing values fall
// back safely. Settings are admin-only writes; staff read.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface OnboardingSettings {
  require_admin_activation_approval: boolean
  block_assignment_until_onboarding_complete: boolean
  insurance_expiry_warning_days: number
  trial_required_default: boolean
  contractor_required_items: string[]
  employee_required_items: string[]
}

export const ONBOARDING_SETTINGS_DEFAULTS: OnboardingSettings = {
  require_admin_activation_approval: true,
  block_assignment_until_onboarding_complete: true,
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

export async function loadOnboardingSettings(supabase: SB): Promise<OnboardingSettings> {
  const { data } = await supabase
    .from('onboarding_settings')
    .select('value')
    .eq('key', 'default')
    .maybeSingle()

  const raw = (data as { value?: Partial<OnboardingSettings> } | null)?.value
  if (!raw || typeof raw !== 'object') return ONBOARDING_SETTINGS_DEFAULTS

  return {
    ...ONBOARDING_SETTINGS_DEFAULTS,
    ...raw,
    contractor_required_items: Array.isArray(raw.contractor_required_items)
      ? raw.contractor_required_items
      : ONBOARDING_SETTINGS_DEFAULTS.contractor_required_items,
    employee_required_items: Array.isArray(raw.employee_required_items)
      ? raw.employee_required_items
      : ONBOARDING_SETTINGS_DEFAULTS.employee_required_items,
  }
}

export function requiredItemsForWorkerType(
  settings: OnboardingSettings,
  workerType: 'contractor' | 'employee',
): string[] {
  return workerType === 'contractor'
    ? settings.contractor_required_items
    : settings.employee_required_items
}
