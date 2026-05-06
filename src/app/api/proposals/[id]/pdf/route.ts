// Proposal Phase 2.3 — server-side PDF generation.
//
// Refactored to use src/lib/pdf/render-pdf.ts so all PDF routes
// (proposals, residential quotes, invoices, public-share variants)
// share one Puppeteer code path. Behaviour is preserved byte-for-byte.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'
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

  const probe = await loadProposalForQuote(supabase, params.id)
  if (!probe) {
    return NextResponse.json(
      { error: 'Proposal not available for this quote' },
      { status: 404 },
    )
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/proposals/print/${params.id}`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.origin)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    const filename = `proposal-${probe.quoteNumber}.pdf`.replace(/[^\w.\-]+/g, '_')
    // Re-wrap with Buffer.from to match the BodyInit signature TS infers
    // for inline NextResponse construction (route handlers don't pull in
    // @types/node, so a Buffer returned via async fn loses its DOM-blob
    // compatibility hint along the way).
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
