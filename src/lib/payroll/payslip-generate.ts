// WRITE path: create the official payslip record + render the exact A4 bytes +
// retain them in the private bucket. Called only from markPayRunPaid and the
// explicit "Generate official payslip" admin action — NEVER from a GET. Forwards
// the caller's session cookies so the auth-gated print route authorises.

import { cookies } from 'next/headers'
import { getServiceSupabase } from '@/lib/supabase-service'
import { renderPdfFromUrl, parseCookieHeader } from '@/lib/pdf/render-pdf'
import { createOfficialPayslipRecord, getCurrentOfficialPayslip } from '@/lib/payroll/payslip-service'

const BUCKET = 'worker-documents'

/**
 * Ensure the official payslip record exists AND its exact PDF bytes are stored.
 * Idempotent: if bytes are already retained, does nothing. Best-effort by design
 * — a render failure leaves the immutable record intact and can be retried.
 */
export async function renderAndStoreOfficialPayslip(lineId: string): Promise<{ ok?: true; skipped?: string; error?: string }> {
  const svc = getServiceSupabase()
  const record = await createOfficialPayslipRecord(svc, lineId)
  if (!record) return { skipped: 'not_paid' }
  if (record.storagePath) return { ok: true } // already retained — never regenerate

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const cookieHeader = cookies().getAll().map((c) => `${c.name}=${c.value}`).join('; ')
  const printUrl = `${origin}/portal/payroll/payslip/${lineId}/print`
  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies: parseCookieHeader(cookieHeader, origin) })
    const path = `payslips/${lineId}/${record.id}.pdf`
    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, buffer, { contentType: 'application/pdf', upsert: false })
    if (upErr && !/already exists/i.test(upErr.message)) return { error: upErr.message }
    await svc.from('payslips').update({ storage_path: path }).eq('id', record.id)
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'render failed' }
  }
}

/** Read-back helper for callers that want the current official after generation. */
export async function currentOfficial(lineId: string) {
  return getCurrentOfficialPayslip(getServiceSupabase(), lineId)
}
