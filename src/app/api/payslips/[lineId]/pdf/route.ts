// Payslip PDF route. Permission-checked (admin, or the owning employee), renders
// the print view to A4, and — for the OFFICIAL payslip of a paid run — stores the
// exact bytes to the private worker-documents bucket once, then serves them.
// Preview PDFs (approved runs) are never stored.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { parseCookieHeader, renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'
import { getCurrentOfficialPayslip } from '@/lib/payroll/payslip-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const BUCKET = 'worker-documents'

export async function GET(request: NextRequest, { params }: { params: { lineId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = isAdminUser(user)

  const svc = getServiceSupabase()
  const { data: line } = await svc.from('pay_run_lines').select('id, contractor_id, pay_run_id').eq('id', params.lineId).maybeSingle()
  if (!line) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })

  // Permission: admin, or the employee who owns this line.
  if (!admin) {
    const { data: c } = await svc.from('contractors').select('full_name, auth_user_id').eq('id', line.contractor_id as string).maybeSingle()
    if ((c?.auth_user_id as string | null) !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: contractor } = await svc.from('contractors').select('full_name').eq('id', line.contractor_id as string).maybeSingle()
  const { data: run } = await svc.from('pay_runs').select('status, pay_date').eq('id', line.pay_run_id as string).maybeSingle()

  const preview = new URL(request.url).searchParams.get('mode') === 'preview'
  const name = (contractor?.full_name as string | null) || 'Employee'
  const payDate = (run?.pay_date as string | null) || ''
  const stem = sanitizePdfFilename(`Sano-Payslip-${name}-${payDate}${preview ? '-PREVIEW' : ''}`)
  const filename = `${stem}.pdf`

  // OFFICIAL: strictly READ-ONLY — serve the already-retained bytes. Never
  // generate on a GET (guards against prefetch / link previews / monitors). If no
  // official payslip is stored yet, tell the caller to generate it explicitly.
  if (!preview) {
    const official = await getCurrentOfficialPayslip(svc, params.lineId)
    if (!official?.storagePath) {
      return NextResponse.json({ error: 'No official payslip yet. Generate it from the pay run (admin).' }, { status: 409 })
    }
    const { data: file } = await svc.storage.from(BUCKET).download(official.storagePath)
    if (!file) return NextResponse.json({ error: 'Stored payslip not found.' }, { status: 404 })
    return pdfResponse(Buffer.from(await file.arrayBuffer()), filename)
  }

  // PREVIEW: render on the fly. Creates NO record and stores nothing.
  const url = new URL(request.url)
  const printUrl = `${url.origin}/portal/payroll/payslip/${params.lineId}/print?mode=preview`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.origin)
  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    return pdfResponse(buffer, filename)
  } catch (err) {
    if (err instanceof RenderPdfError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: `PDF generation failed: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 })
  }
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
