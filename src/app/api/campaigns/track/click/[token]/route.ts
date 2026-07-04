import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'

/**
 * Click-tracking redirect. Records the click then 302s to the target.
 * Only same-site targets are honoured (open-redirect guard); anything
 * else falls back to the site root.
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const url = new URL(req.url)
  const rawTarget = url.searchParams.get('to') || SITE

  let target = SITE
  try {
    const parsed = new URL(rawTarget)
    const site = new URL(SITE)
    if (parsed.origin === site.origin) target = parsed.toString()
  } catch {
    // keep fallback
  }

  const token = params.token
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    try {
      const supabase = getServiceSupabase()
      const { data: rec } = await supabase
        .from('sales_campaign_recipients')
        .select('id, click_count, first_clicked_at, opened_at')
        .eq('token', token)
        .single()
      if (rec) {
        await supabase
          .from('sales_campaign_recipients')
          .update({
            click_count: (rec.click_count ?? 0) + 1,
            first_clicked_at: rec.first_clicked_at ?? new Date().toISOString(),
            // A click implies an open even if the pixel was blocked.
            opened_at: rec.opened_at ?? new Date().toISOString(),
          })
          .eq('id', rec.id)
      }
    } catch {
      // Tracking must never block the redirect.
    }
  }

  return NextResponse.redirect(target, 302)
}
