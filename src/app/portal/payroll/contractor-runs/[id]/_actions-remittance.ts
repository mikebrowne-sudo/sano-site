'use server'

// Send remittance advice to each contractor in a PAID pay run.
//
// For every contractor with items in the run: ensure a
// pay_run_remittances row exists (token + RA-number via DB defaults),
// render their remittance PDF from the public token route, email it
// (PDF attached + a view link), and stamp sent_at. Re-running reuses
// the same remittance row/number/token. Admin-only.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminEmail } from '@/lib/is-admin'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getRemittanceByToken } from '@/lib/remittance-data'
import { formatCurrency, formatDate } from '@/lib/format'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

interface ItemRow {
  contractor_id: string
  contractors: { email: string | null; full_name: string | null } | null
}

export async function sendRemittances(payRunId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  const svc = getServiceSupabase()
  const { data: run } = await svc
    .from('pay_runs')
    .select('id, kind, status')
    .eq('id', payRunId)
    .maybeSingle()
  if (!run || run.kind !== 'contractor') return { error: 'Pay run not found.' }
  if (run.status !== 'paid') return { error: 'Remittances can only be sent once the pay run is marked paid.' }

  const { data: itemsRaw } = await svc
    .from('pay_run_items')
    .select('contractor_id, contractors ( email, full_name )')
    .eq('pay_run_id', payRunId)
  const items = (itemsRaw ?? []) as unknown as ItemRow[]

  const byContractor = new Map<string, { email: string | null; name: string }>()
  for (const it of items) {
    if (!byContractor.has(it.contractor_id)) {
      byContractor.set(it.contractor_id, {
        email: it.contractors?.email ?? null,
        name: it.contractors?.full_name ?? 'Contractor',
      })
    }
  }
  if (byContractor.size === 0) return { error: 'No contractors in this pay run.' }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date().toISOString()

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const [contractorId, info] of Array.from(byContractor.entries())) {
    const { data: rem, error: upErr } = await svc
      .from('pay_run_remittances')
      .upsert({ pay_run_id: payRunId, contractor_id: contractorId }, { onConflict: 'pay_run_id,contractor_id' })
      .select('token, remittance_number')
      .single()
    if (upErr || !rem) { errors.push(`${info.name}: could not create remittance`); continue }

    if (!info.email) { skipped++; continue }

    let pdf: Buffer
    try {
      pdf = await renderPdfFromUrl(`${origin}/remittance/${rem.token}`)
    } catch {
      errors.push(`${info.name}: PDF generation failed`)
      continue
    }

    const data = await getRemittanceByToken(rem.token as string)
    const totalLabel = data ? formatCurrency(data.total) : ''
    const periodLabel = data?.periodStart && data?.periodEnd
      ? `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`
      : ''
    const viewUrl = `${origin}/remittance/${rem.token}`
    const filename = `${sanitizePdfFilename(`Sano Remittance - ${rem.remittance_number}`)}.pdf`

    const { error: emailErr } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: info.email,
      subject: `Your remittance advice from Sano (${rem.remittance_number})`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#3f4a3f;line-height:1.6">
          <p>Hi ${info.name.split(/\s+/)[0]},</p>
          <p>You've been paid for the pay period${periodLabel ? ` <strong>${periodLabel}</strong>` : ''}.
          ${totalLabel ? `Total paid: <strong>${totalLabel}</strong>.` : ''}</p>
          <p>Your remittance advice (${rem.remittance_number}) is attached, and you can view it online here:</p>
          <p><a href="${viewUrl}" style="color:#5a6b5a">${viewUrl}</a></p>
          <p>Amounts shown are the total paid; you're responsible for your own GST and tax. Any questions, just reply to this email.</p>
          <p>— Sano</p>
        </div>`,
      attachments: [{ filename, content: pdf }],
    })
    if (emailErr) { errors.push(`${info.name}: email failed`); continue }

    await svc
      .from('pay_run_remittances')
      .update({ sent_at: now, sent_by: user.id })
      .eq('pay_run_id', payRunId)
      .eq('contractor_id', contractorId)
    sent++
  }

  revalidatePath(`/portal/payroll/contractor-runs/${payRunId}`)
  return { ok: true as const, sent, skipped, errors }
}
