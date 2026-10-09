// Abuse guards for the public forms (quote request, job application).
//
// Both forms email whatever address is typed in, from sano.nz. Without limits
// a script could make sano.nz send thousands of emails — hurting the domain's
// sending reputation that Carol's outreach depends on. Three cheap layers:
//   • honeypot  — a hidden field people never see; bots fill it in
//   • length caps on free-text fields
//   • throttle   — per email address, and overall, over a recent window

import type { SupabaseClient } from '@supabase/supabase-js'

export const HONEYPOT_FIELD = 'company_website'

/** True when the hidden honeypot field was filled in (a bot). */
export function isHoneypotTripped(body: Record<string, unknown> | null | undefined): boolean {
  const v = body?.[HONEYPOT_FIELD]
  return typeof v === 'string' && v.trim().length > 0
}

/** First field longer than its cap, or null. */
export function overLength(fields: Record<string, unknown>, caps: Record<string, number>): string | null {
  for (const [key, max] of Object.entries(caps)) {
    const v = fields[key]
    if (typeof v === 'string' && v.length > max) return key
  }
  return null
}

/**
 * Has this address (or everyone) sent too many recently? Counts rows created
 * in the window. Fails OPEN on a lookup error — a genuine customer must never
 * be blocked because a count query hiccuped.
 */
export async function isThrottled(
  client: SupabaseClient | (() => SupabaseClient),
  opts: { table: string; emailColumn: string; email: string; perEmail: number; overall: number; minutes: number },
): Promise<boolean> {
  try {
    const supabase = typeof client === 'function' ? client() : client
    const since = new Date(Date.now() - opts.minutes * 60_000).toISOString()
    const [{ count: mine }, { count: all }] = await Promise.all([
      supabase.from(opts.table).select('id', { count: 'exact', head: true }).ilike(opts.emailColumn, opts.email.trim()).gte('created_at', since),
      supabase.from(opts.table).select('id', { count: 'exact', head: true }).gte('created_at', since),
    ])
    return (mine ?? 0) >= opts.perEmail || (all ?? 0) >= opts.overall
  } catch {
    return false
  }
}
