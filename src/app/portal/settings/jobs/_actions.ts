'use server'

// Phase D.2 — job settings server actions. Admin-only; mirrors the
// proposal-settings action pattern.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  validateJobSettings,
  DEFAULT_JOB_SETTINGS,
  SETTINGS_KEY,
  type JobSettings,
} from '@/lib/job-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

type ActionResult = { ok: true; settings: JobSettings } | { error: string }

async function requireAdmin(): Promise<{ ok: true; userId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { ok: true, userId: user.id }
}

function revalidateAll() {
  revalidatePath('/portal/settings/jobs')
  revalidatePath('/portal/jobs', 'layout')
}

export async function saveJobSettings(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const validated = validateJobSettings(input)
  if ('error' in validated) return { error: validated.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('job_settings')
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

export async function resetJobSettings(): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = createClient()
  const { error } = await supabase
    .from('job_settings')
    .delete()
    .eq('key', SETTINGS_KEY)
  if (error) return { error: `Failed to reset settings: ${error.message}` }

  revalidateAll()
  return { ok: true, settings: DEFAULT_JOB_SETTINGS }
}
