'use server'

// Phase 5.5.14 — dedicated server action for the Cleanup-mode toggle.
//
// Pulled out of portal-access/_actions.ts so the toggle lives next to
// its UI and can't accidentally get bundled with the contractor /
// customer portal flags. Admin-only; audited.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

export async function setCleanupMode(
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }

  const current = await loadWorkforceSettings(supabase)
  const next = { ...current, enable_cleanup_mode: !!enabled }

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
    action: enabled ? 'cleanup_mode.enabled' : 'cleanup_mode.disabled',
    entity_table: 'workforce_settings',
    entity_id: null,
    before: { enable_cleanup_mode: current.enable_cleanup_mode },
    after:  { enable_cleanup_mode: next.enable_cleanup_mode },
  })

  // Revalidate every surface that reads canCleanup.
  for (const p of ['/portal', '/portal/quotes', '/portal/jobs', '/portal/invoices', '/portal/settings', '/portal/settings/cleanup-mode']) {
    revalidatePath(p)
  }
  return { ok: true }
}
