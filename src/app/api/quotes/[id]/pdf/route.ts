// Staff-only PDF for residential quotes.
// Commercial quotes use /api/proposals/[id]/pdf instead — this route
// returns 400 with a pointer if called with a commercial quote.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import {
  parseCookieHeader,
  renderPdfFromUrl,
  RenderPdfError,
} from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, service_category, deleted_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.service_category === 'commercial') {
    return NextResponse.json(
      { error: 'Commercial quotes use /api/proposals/[id]/pdf' },
      { status: 400 },
    )
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/portal/quotes/${params.id}/print`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.origin)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies, anchorClosingBlock: true })
    const stem = sanitizePdfFilename(`Sano Quote - ${quote.quote_number}`)
    const filename = `${stem}.pdf`
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
