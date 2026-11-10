// Signed-agreement PDF for the signer (token-keyed, no login) — the "Download
// PDF" button on the signed agreement page. Renders the public print view, same
// as the copy attached to the confirmation email. Signed agreements only.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc
    .from('employment_agreements')
    .select('status, employee_full_name, person_label')
    .eq('token', params.token)
    .maybeSingle()
  if (!a || a.status !== 'signed') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(request.url)
  const printUrl = `${url.origin}/agreement/${params.token}/print`

  try {
    const buffer = await renderPdfFromUrl(printUrl)
    const who = (a.employee_full_name as string | null) || (a.person_label as string | null) || 'agreement'
    const filename = `${sanitizePdfFilename(`Sano Agreement - ${who}`)}.pdf`
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) return NextResponse.json({ error: err.message }, { status: err.status })
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `PDF generation failed: ${message}` }, { status: 500 })
  }
}
