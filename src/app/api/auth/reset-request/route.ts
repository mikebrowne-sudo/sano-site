// Phase 5.5.1 — Public reset-request endpoint.
//
// POST /api/auth/reset-request  { email }
//
// Always returns { ok: true } regardless of whether the email maps
// to a real auth user — preserves email-existence privacy. Real
// errors only surface for genuine 5xx server problems so the form
// can show a "try again later" hint.

import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/auth-invites'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: { email?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Don't leak validation specifics — single generic error.
    return NextResponse.json({ ok: true })
  }

  const result = await requestPasswordReset({ email })
  if ('error' in result) {
    return NextResponse.json({ error: 'Service temporarily unavailable. Please try again.' }, { status: 503 })
  }
  return NextResponse.json({ ok: true })
}
