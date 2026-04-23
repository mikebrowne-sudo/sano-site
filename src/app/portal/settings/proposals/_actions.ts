'use server'

// Proposal settings — admin-only server actions.
// Manual server-side validation via validateProposalSettings (project
// doesn't use zod; matches the pricing-engine + display-settings style).

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  validateProposalSettings,
  DEFAULT_PROPOSAL_SETTINGS,
  SETTINGS_KEY,
  type ProposalSettings,
} from '@/lib/proposals/proposal-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

type ActionResult = { ok: true; settings: ProposalSettings } | { error: string }

async function requireAdmin(): Promise<{ ok: true; userId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { ok: true, userId: user.id }
}

function revalidateAll() {
  // Settings page itself, plus the surfaces that consume the settings.
  revalidatePath('/portal/settings/proposals')
  revalidatePath('/portal/proposals/preview')
  revalidatePath('/portal/quotes', 'layout')
}

export async function saveProposalSettings(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const validated = validateProposalSettings(input)
  if ('error' in validated) return { error: validated.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('proposal_settings')
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

export async function resetProposalSettings(): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = createClient()
  // Delete the row so the loader's defaults take over; the table only
  // carries truly-customised settings.
  const { error } = await supabase
    .from('proposal_settings')
    .delete()
    .eq('key', SETTINGS_KEY)
  if (error) return { error: `Failed to reset settings: ${error.message}` }

  revalidateAll()
  return { ok: true, settings: DEFAULT_PROPOSAL_SETTINGS }
}
