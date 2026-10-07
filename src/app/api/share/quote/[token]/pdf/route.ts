import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = getServiceSupabase()
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, deleted_at, service_category')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(request.url)
  const printUrl = `${url.origin}/share/quote/${params.token}?pdf=1`

  try {
    const buffer = await renderPdfFromUrl(printUrl, { anchorClosingBlock: true })
    // Commercial quotes are delivered as a proposal; the filename should say
    // so, since it is what the client sees in their inbox and file system.
    const label = quote.service_category === 'commercial' ? 'Proposal' : 'Quote'
    const stem = sanitizePdfFilename(`Sano ${label} - ${quote.quote_number}`)
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
