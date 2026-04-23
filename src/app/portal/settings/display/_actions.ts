'use server'

// Phase 2 — Portal display settings server actions.
// Admin-only. Manual server-side validation via mergeDisplaySettings
// (project doesn't use zod — matches the pricing-engine action style).

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  validateDisplayPayload,
  DEFAULT_DISPLAY_SETTINGS,
  SETTINGS_KEY,
  type DisplaySettings,
} from '@/lib/portal-display-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

type ActionResult = { ok: true; settings: DisplaySettings } | { error: string }

async function requireAdmin(): Promise<{ ok: true; userId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { ok: true, userId: user.id }
}

function revalidateAll() {
  // Settings page itself, plus the two surfaces that consume the
  // settings today.
  revalidatePath('/portal/settings/display')
  revalidatePath('/portal/jobs')
  revalidatePath('/portal/quotes')
}

export async function saveDisplaySettings(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const validated = validateDisplayPayload(input)
  if ('error' in validated) return { error: validated.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('portal_settings')
    .upsert(
      {
        key: SETTINGS_KEY,
        value: validated.value as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: 'key' },
    )
  if (error) return { error: `Failed to save settings: ${error.message}` }

  revalidateAll()
  return { ok: true, settings: validated.value }
}

export async function resetDisplaySettings(): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = createClient()
  // Delete the row so the loader's defaults take over. Cleaner than
  // upserting the defaults — the table only carries truly-customised
  // settings.
  const { error } = await supabase
    .from('portal_settings')
    .delete()
    .eq('key', SETTINGS_KEY)
  if (error) return { error: `Failed to reset settings: ${error.message}` }

  revalidateAll()
  return { ok: true, settings: DEFAULT_DISPLAY_SETTINGS }
}
