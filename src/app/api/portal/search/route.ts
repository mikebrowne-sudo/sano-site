// Live search endpoint backing the portal command palette (Cmd/Ctrl+K).
// Returns grouped results across every portal record type. Auth-gated;
// finance-only (accountant) users are blocked here too, matching the
// middleware that keeps them in the finance area.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAccountantEmail, isAdminEmail } from '@/lib/is-admin'
import { searchPortal } from '@/lib/portal-search'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Accountants are scoped to finance — no cross-entity search.
  if (isAccountantEmail(user.email) && !isAdminEmail(user.email)) {
    return NextResponse.json({ groups: [] })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ groups: [] })

  const groups = await searchPortal(supabase, q, { limit: 6 })
  return NextResponse.json({ groups })
}
