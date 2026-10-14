// The non-expiring "set up automatic payments" link a customer gets by email.
// Each visit creates a fresh Stripe setup page and sends them to it. The token
// is signed (lib/autopay), so a client id can't be guessed or swapped.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { createAutopaySetupLink, verifyAutopayLinkToken } from '@/lib/autopay'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const clientId = verifyAutopayLinkToken(params.token)
  if (!clientId) return NextResponse.redirect(`${origin}/share/direct-debit?invalid=1`, 303)

  const res = await createAutopaySetupLink(getServiceSupabase(), clientId, origin)
  if ('error' in res) {
    console.error('[autopay-link] could not start setup:', res.error)
    return NextResponse.redirect(`${origin}/share/direct-debit?invalid=1`, 303)
  }
  return NextResponse.redirect(res.url, 303)
}
