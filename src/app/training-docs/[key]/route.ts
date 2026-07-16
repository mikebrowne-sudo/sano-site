// Authenticated H&S / training document delivery. The induction modules link
// here (e.g. /training-docs/hs_induction); only a logged-in portal user
// (contractor or staff) can open it. We look up the file in the PRIVATE
// `training-docs` bucket and 302-redirect to a short-lived signed URL, so the
// documents are never publicly reachable.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

const BUCKET = 'training-docs'

// Module key → the exact object name in the private training-docs bucket.
const FILES: Record<string, string> = {
  hs_induction: 'Sano - Health & Safety Plan.pdf',
  hazardous_substances: 'Sano - Hazardous Chemical Substance Register.pdf',
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  // Require a logged-in portal session (staff or contractor).
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Please sign in to the Sano portal to view this document.', { status: 401 })
  }

  const file = FILES[params.key]
  if (!file) return new NextResponse('Not found', { status: 404 })

  const svc = getServiceSupabase()
  const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(file, 300)
  if (error || !data?.signedUrl) {
    return new NextResponse('This document isn’t available yet.', { status: 404 })
  }
  return NextResponse.redirect(data.signedUrl)
}
