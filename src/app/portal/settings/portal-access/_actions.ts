'use server'

// Phase 5.5.8 — settings save action.
//
// Loads the current `workforce_settings` singleton, merges in the
// admin's edits, and writes back. Admin-only. Audited.
//
// Save scope is intentionally narrow — only the keys exposed by the
// settings form. Other settings (require_admin_activation_approval,
// etc.) keep their current values.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

export interface SettingsFormInput {
  enable_contractor_portal: boolean
  enable_customer_portal: boolean
  enable_pwa_prompt: boolean
  invite_email_subject: string
  invite_email_body_template: string
  reset_email_subject: string
  reset_email_body_template: string
}

export async function updatePortalSettings(input: SettingsFormInput): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }

  // Pull the current snapshot so we preserve every other key.
  const current = await loadWorkforceSettings(supabase)

  const next = {
    ...current,
    enable_contractor_portal: input.enable_contractor_portal,
    enable_customer_portal:   input.enable_customer_portal,
    enable_pwa_prompt:        input.enable_pwa_prompt,
    invite_email_subject:       input.invite_email_subject.trim(),
    invite_email_body_template: input.invite_email_body_template.trim(),
    reset_email_subject:        input.reset_email_subject.trim(),
    reset_email_body_template:  input.reset_email_body_template.trim(),
  }

  const { error } = await supabase
    .from('workforce_settings')
    .upsert({
      key: 'default',
      value: next,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'key' })

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'settings.updated',
    entity_table: 'workforce_settings',
    entity_id: null,
    before: {
      enable_contractor_portal: current.enable_contractor_portal,
      enable_customer_portal:   current.enable_customer_portal,
      enable_pwa_prompt:        current.enable_pwa_prompt,
    },
    after: {
      enable_contractor_portal: next.enable_contractor_portal,
      enable_customer_portal:   next.enable_customer_portal,
      enable_pwa_prompt:        next.enable_pwa_prompt,
    },
  })

  revalidatePath('/portal/settings')
  return { ok: true }
}
