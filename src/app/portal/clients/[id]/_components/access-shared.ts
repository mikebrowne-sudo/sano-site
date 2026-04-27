// Phase 5.5.10 fix — shared access-status helpers.
//
// Lives in a plain (no-directive) module so BOTH ClientAccessPanel
// (server component) and ClientAccessActions (client component) can
// safely import the type, constants, and pure status function.
//
// Background: Next.js 14 does not allow a server component to import
// non-component values (constants, helpers) from a `'use client'`
// module — Next bundles them as client-reference proxies, and calling
// them server-side throws ("X is not a function") with a stripped
// production message ("An error occurred in the Server Components
// render"). Splitting the helpers out fixes that class of crash.

export type AccessStatus =
  | 'not_invited'
  | 'invited'
  | 'active'
  | 'disabled'
  | 'feature_disabled'

export const STATUS_LABEL: Record<AccessStatus, string> = {
  not_invited:      'Not invited',
  invited:          'Invited',
  active:           'Active',
  disabled:         'Disabled',
  feature_disabled: 'Portal disabled',
}

export const STATUS_BADGE: Record<AccessStatus, string> = {
  not_invited:      'bg-gray-100 text-gray-600',
  invited:          'bg-amber-50 text-amber-700',
  active:           'bg-emerald-100 text-emerald-800',
  disabled:         'bg-red-50 text-red-700',
  feature_disabled: 'bg-gray-100 text-gray-500',
}

export function clientAccessStatus(
  c: {
    access_disabled_at: string | null
    invite_accepted_at: string | null
    invite_sent_at: string | null
    auth_user_id: string | null
  },
  featureEnabled = true,
): AccessStatus {
  if (!featureEnabled) return 'feature_disabled'
  if (c.access_disabled_at) return 'disabled'
  if (c.invite_accepted_at) return 'active'
  if (c.invite_sent_at) return 'invited'
  return 'not_invited'
}
