// Server-rendered remittance PDF (admin-only).
//
// Reuses the shared Puppeteer renderer that powers the quote / invoice /
// proposal PDFs. Keyed by remittance id (the public token route lives in
// a permission-restricted directory, so we look the batch up by id here
// and render its public share URL). The output is a clean A4 PDF with NO
// browser headers/footers — the artifact a future Send-email step will
// attach. Contractor pay amounts only; no margin / client / quote data.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batch = await getRemittanceBatchById(params.id)
  if (!batch) {
    return NextResponse.json({ error: 'Remittance not found' }, { status: 404 })
  }

  // Render the public token route — no auth/cookies needed (service-role,
  // token-keyed). The document's @media print rules + @page A4 produce the
  // clean layout; Puppeteer adds no browser header/footer.
  const url = new URL(request.url)
  const printUrl = `${url.origin}/remittance-batch/${batch.token}`

  try {
    const buffer = await renderPdfFromUrl(printUrl)
    const stem = sanitizePdfFilename(`Sano Remittance - ${batch.remittanceNumber}`)
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
