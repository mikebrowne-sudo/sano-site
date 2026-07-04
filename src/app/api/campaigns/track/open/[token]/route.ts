import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

/**
 * Open-tracking pixel. Always returns the pixel, even for bad tokens, so
 * the request never breaks an email render. First open wins; later opens
 * are ignored (opened_at stays the earliest).
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    try {
      const supabase = getServiceSupabase()
      await supabase
        .from('sales_campaign_recipients')
        .update({ opened_at: new Date().toISOString() })
        .eq('token', token)
        .is('opened_at', null)
    } catch {
      // Tracking must never fail the pixel.
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
