// Signed-agreement PDF. Renders the portal print view to a PDF, matching the
// quote/invoice PDF routes. Staff-auth for direct download; the sign-side
// (post-unlock) will reuse renderPdfFromUrl to attach the signed copy to the
// confirmation email.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { parseCookieHeader, renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: a } = await supabase
    .from('employment_agreements')
    .select('id, person_label, employee_full_name, agreement_type')
    .eq('id', params.id)
    .maybeSingle()
  if (!a) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })

  const url = new URL(request.url)
  const printUrl = `${url.origin}/portal/agreements/${params.id}/print`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.origin)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    const who = (a.employee_full_name as string | null) || (a.person_label as string | null) || 'agreement'
    const stem = sanitizePdfFilename(`Sano Agreement - ${who}`)
    const filename = `${stem}.pdf`
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
