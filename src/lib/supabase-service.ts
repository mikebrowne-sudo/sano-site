// Service-role Supabase client. Bypasses RLS — server-side ONLY.
//
// Used for actions that have to write to staff-only tables (audit_log,
// record_snapshots) in contexts without an auth session — most notably
// the public quote-accept / share-page view-tracker flows.
//
// Never import this from a client component or expose the key. Server
// actions only.

import { createClient } from '@supabase/supabase-js'

// Every read must be live. Next.js 14 caches server-side fetch() by default,
// and supabase-js reads over fetch — so without no-store a share page opened
// while an invoice was a draft kept rendering it as a draft (no Pay button),
// and a paid invoice could keep showing "Pay".
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: noStoreFetch } },
  )
}
