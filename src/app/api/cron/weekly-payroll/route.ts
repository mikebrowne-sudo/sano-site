// Weekly payroll auto-draft cron.
//
// Invoked once a week by the Netlify Scheduled Function in
// netlify/functions/weekly-payroll.mts (Monday ~09:00 NZ). Auth: Bearer token
// must equal CRON_SECRET. Uses the service-role Supabase client (no user
// session).
//
// It creates a DRAFT weekly pay run for the week just ended and emails Mike to
// review it. It NEVER approves or pays — a human approves + pays in the portal.
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
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
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

  // The week just ended: 7 days ending yesterday (NZ), pay date today.
  const periodStart = nzDateString(-7)
  const periodEnd = nzDateString(-1)
  const payDate = nzDateString(0)

  const res = await createEmployeePayRun(supabase, {
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
    pay_date: payDate,
    pay_frequency: 'weekly',
    notes: 'Auto-drafted weekly pay run — review, approve and pay in the portal.',
  })

  if (res.duplicate) {
    return NextResponse.json({ ok: true, skipped: 'A weekly pay run already exists for this period.' })
  }
  if (res.error || !res.id) {
    return NextResponse.json({ error: res.error ?? 'Failed to create the draft.' }, { status: 500 })
  }

  // Notify — draft only, never auto-paid.
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? ''
  if (notifyEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sano <noreply@sano.nz>',
        to: notifyEmail,
        subject: `Weekly pay run drafted — ${periodStart} to ${periodEnd}`,
        html: `<p>A weekly pay run has been <strong>auto-drafted</strong> for ${periodStart} – ${periodEnd}.</p>
          <p>It is a draft only — nothing has been approved or paid. Review, approve and pay it here:</p>
          <p><a href="${baseUrl}/portal/payroll/${res.id}">${baseUrl}/portal/payroll/${res.id}</a></p>`,
      })
    } catch {
      // Notification failure is non-fatal — the draft still exists to review.
    }
  }

  return NextResponse.json({ ok: true, payRunId: res.id, period: { periodStart, periodEnd, payDate } })
}
