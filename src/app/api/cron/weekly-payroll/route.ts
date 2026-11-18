// Weekly payroll auto-draft cron.
//
// Invoked once a week by the Netlify Scheduled Function in
// netlify/functions/weekly-payroll.mts (Monday ~09:00 NZ). Auth: Bearer token
// must equal CRON_SECRET. Uses the service-role Supabase client (no user
// session).
//
// It creates a DRAFT weekly pay run for the week STARTING today — wages are paid
// in advance, by bank automatic payment, on the Monday — and emails Mike. It
// never approves or pays by itself: when a bank import shows the payment
// ("A/P WAGES CAROL", same net amount), auto-reconcile approves the run and
// marks it paid on the bank date (finance/reconcile/_auto-out.ts).
// The double-pay guard (unique index on employee cycle + period-end) means a
// manual run already created for the week makes this a safe no-op.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { createEmployeePayRun } from '@/lib/payroll/create-employee-pay-run'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** NZ-local calendar date (yyyy-mm-dd), offset by whole days. */
function nzDateString(offsetDays = 0): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [y, m, d] = fmt.format(new Date()).split('-')
  const day = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  day.setUTCDate(day.getUTCDate() + offsetDays)
  return day.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  // Refuse outright if the secret isn't configured — otherwise the header
  // "Bearer undefined" would be accepted.
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Only draft if there's at least one active weekly employee — no empty runs.
  const { count } = await supabase
    .from('contractors')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .neq('worker_type', 'contractor')
    .eq('pay_frequency', 'weekly')
  if (!count) {
    return NextResponse.json({ ok: true, skipped: 'No active weekly employees.' })
  }

  // This week, paid in advance: today (Monday, NZ) to Sunday, pay date today —
  // the same day the automatic payment leaves the bank.
  const periodStart = nzDateString(0)
  const periodEnd = nzDateString(6)
  const payDate = nzDateString(0)

  const res = await createEmployeePayRun(supabase, {
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
    pay_date: payDate,
    pay_frequency: 'weekly',
    notes: 'Auto-drafted weekly pay run — approved and marked paid automatically when the bank shows the payment.',
  })

  if (res.duplicate) {
    return NextResponse.json({ ok: true, skipped: 'A weekly pay run already exists for this period.' })
  }
  if (res.error || !res.id) {
    return NextResponse.json({ error: res.error ?? 'Failed to create the draft.' }, { status: 500 })
  }

  // Notify — the run is a draft until the bank shows the payment.
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? ''
  // Surface any pay-line review flags (e.g. an expired KiwiSaver temporary
  // reduction) so they can't slip through unnoticed on the unattended path.
  const warnings = res.warnings ?? []
  const warningsHtml = warnings.length
    ? `<div style="margin-top:16px;padding:12px;border:1px solid #f0c36d;background:#fff8e1;border-radius:8px;">
         <p style="margin:0 0 6px;font-weight:600;color:#8a6d0b;">Review required before finalising:</p>
         <ul style="margin:0;padding-left:18px;color:#8a6d0b;">${warnings.map((w) => `<li>${w.message}</li>`).join('')}</ul>
       </div>`
    : ''
  if (notifyEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sano <noreply@sano.nz>',
        to: notifyEmail,
        subject: `Weekly pay run drafted — ${periodStart} to ${periodEnd}${warnings.length ? ' (review required)' : ''}`,
        html: `<p>A weekly pay run has been <strong>auto-drafted</strong> for ${periodStart} – ${periodEnd}.</p>
          <p>When your next bank import shows the payment, it will be approved and marked paid automatically, and its PAYE added to the IRD ledger. If the amount paid differs, it stays a draft for you to check:</p>
          <p><a href="${baseUrl}/portal/payroll/${res.id}">${baseUrl}/portal/payroll/${res.id}</a></p>
          ${warningsHtml}`,
      })
    } catch {
      // Notification failure is non-fatal — the draft still exists to review.
    }
  }

  return NextResponse.json({ ok: true, payRunId: res.id, warnings, period: { periodStart, periodEnd, payDate } })
}
