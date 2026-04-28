// Phase 5.5.14 — cleanup-mode access control.
//
// Two gates protect every lifecycle action (Mark as test / Archive /
// Restore — single AND bulk):
//   1. The caller must be the admin (michael@sano.nz).
//   2. workforce_settings.enable_cleanup_mode must be true.
//
// The toggle defaults OFF so the system behaves as a normal operational
// tool unless the admin explicitly enables cleanup. The same gate is
// re-applied on the server even when the UI hides the controls — UI
// hides are convenience, not security.

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadWorkforceSettings } from './workforce-settings'

export const ADMIN_EMAIL = 'michael@sano.nz'

export interface CleanupAccess {
  isAdmin: boolean
  isCleanupModeEnabled: boolean
  canCleanup: boolean
  userId: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

export async function getCleanupAccess(supabase: SB): Promise<CleanupAccess> {
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user && user.email === ADMIN_EMAIL

  // Skip the settings load entirely for non-admins. There's no UI
  // path that would need it, and we don't want to leak settings
  // shape via timing.
  if (!isAdmin) {
    return {
      isAdmin: false,
      isCleanupModeEnabled: false,
      canCleanup: false,
      userId: user?.id ?? null,
    }
  }

  const settings = await loadWorkforceSettings(supabase)
  const isCleanupModeEnabled = !!settings.enable_cleanup_mode

  return {
    isAdmin: true,
    isCleanupModeEnabled,
    canCleanup: isCleanupModeEnabled,
    userId: user.id,
  }
}

// Server-action gate. Returns either { ok: true, userId } or
// { error: string }. Pass the supabase server client; the helper
// centralises the two messages so server actions don't drift apart.
export async function requireCleanupAccess(
  supabase: SB,
): Promise<{ ok: true; userId: string } | { error: string }> {
  const access = await getCleanupAccess(supabase)
  if (!access.isAdmin) return { error: 'Admin only.' }
  if (!access.isCleanupModeEnabled) {
    return { error: 'Cleanup mode is disabled. Enable it in Settings → Portal access.' }
  }
  return { ok: true, userId: access.userId as string }
}
