// Phase H.4 — daily SMS cron (day-before reminders + overdue payment cadence).
//
// Invoked by the Netlify Scheduled Function in netlify/functions/
// once per day. Auth: Bearer token must equal CRON_SECRET. Uses the
// service-role Supabase client because the cron runs without a user
// session and needs to read jobs / invoices / clients / contractors.
//
// Two tasks run sequentially:
//
//   A. Day-before reminders. Picks jobs where scheduled_date is
//      tomorrow (NZ-local) and status is draft/assigned. For each
//      job, sends customer.job_reminder_day_before to the client and
//      contractor.job_reminder_day_before to the contractor.
//      Per-job, per-audience same-day dedupe via notification_logs.
//
//   B. Overdue invoice reminders. Picks invoices where status='sent'
//      and due_date < today (NZ-local). Cadence:
//        • first reminder once daysOverdue >= 3
//        • subsequent reminders only when last reminder >= 7 days ago
//        • hard cap of 3 reminders per invoice
//      State is derived entirely from notification_logs — no schema
//      additions needed.
//
// Failures inside one task do not block the other. Any per-row
// failure is captured in the response summary.errors[]; sendNotification
// itself writes notification_logs for every outcome.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sendNotification } from '@/lib/notifications/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUSINESS_NAME  = 'Sano'
const BUSINESS_PHONE = '0800 726 686'

// ── Date helpers (Pacific/Auckland) ────────────────────────────────

function nzDateString(offsetDays = 0): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [y, m, d] = fmt.format(new Date()).split('-')
  const today = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  today.setUTCDate(today.getUTCDate() + offsetDays)
  return today.toISOString().slice(0, 10)
}

function fmtDateNZ(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-NZ', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtFullDateNZ(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Handler ────────────────────────────────────────────────────────

async function runDaily(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const summary = {
    started_at: new Date().toISOString(),
    day_before: {
      jobs_scanned: 0,
      customer_sent: 0, customer_skipped: 0,
      contractor_sent: 0, contractor_skipped: 0,
    },
    overdue: {
      invoices_scanned: 0,
      sent: 0, skipped: 0,
    },
    errors: [] as string[],
  }

  const todayStartUTC = new Date()
  todayStartUTC.setUTCHours(0, 0, 0, 0)
  const todayStartIso = todayStartUTC.toISOString()

  // ════ Task A — Day-before reminders ════════════════════════════
  try {
    const tomorrow = nzDateString(1)

    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select(`
        id, job_number, title, address, scheduled_date, scheduled_time,
        allowed_hours, status, client_id, contractor_id, deleted_at,
        clients ( name, phone ),
        contractors ( full_name, phone )
      `)
      .eq('scheduled_date', tomorrow)
      .in('status', ['draft', 'assigned'])
      .is('deleted_at', null)

    if (jobsErr) {
      summary.errors.push(`day_before query: ${jobsErr.message}`)
    } else if (jobs) {
      summary.day_before.jobs_scanned = jobs.length
      const fmtDate = fmtDateNZ(tomorrow)

      for (const job of jobs) {
        const baseVars = {
          job_title:      job.title ?? job.job_number,
          job_number:     job.job_number,
          site_address:   job.address ?? '',
          scheduled_date: fmtDate,
          scheduled_time: job.scheduled_time ?? '',
          allowed_hours:  job.allowed_hours != null ? String(job.allowed_hours) : '',
          business_name:  BUSINESS_NAME,
          business_phone: BUSINESS_PHONE,
        }

        // ── Customer ────────────────────────────────────────────
        if (job.client_id && job.clients) {
          const client = job.clients as unknown as { name: string | null; phone: string | null }
          const { count: alreadySent } = await supabase
            .from('notification_logs')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'job_reminder_day_before')
            .eq('audience', 'customer')
            .eq('related_job_id', job.id)
            .eq('status', 'sent')
            .gte('created_at', todayStartIso)
          if ((alreadySent ?? 0) > 0) {
            summary.day_before.customer_skipped++
          } else {
            const r = await sendNotification(supabase, {
              type: 'job_reminder_day_before',
              channel: 'sms',
              audience: 'customer',
              source: 'automated',
              recipientName: client.name,
              recipientPhone: client.phone,
              variables: { ...baseVars, client_name: (client.name ?? '').split(/\s+/)[0] },
              jobId: job.id,
              clientId: job.client_id,
            })
            if (r.status === 'sent') summary.day_before.customer_sent++
            else                     summary.day_before.customer_skipped++
          }
        }

        // ── Contractor ──────────────────────────────────────────
        if (job.contractor_id && job.contractors) {
          const contractor = job.contractors as unknown as { full_name: string | null; phone: string | null }
          const { count: alreadySent } = await supabase
            .from('notification_logs')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'job_reminder_day_before')
            .eq('audience', 'contractor')
            .eq('related_job_id', job.id)
            .eq('status', 'sent')
            .gte('created_at', todayStartIso)
          if ((alreadySent ?? 0) > 0) {
            summary.day_before.contractor_skipped++
          } else {
            const r = await sendNotification(supabase, {
              type: 'job_reminder_day_before',
              channel: 'sms',
              audience: 'contractor',
              source: 'automated',
              recipientName: contractor.full_name,
              recipientPhone: contractor.phone,
              variables: { ...baseVars, contractor_name: (contractor.full_name ?? '').split(/\s+/)[0] },
              jobId: job.id,
              contractorId: job.contractor_id,
            })
            if (r.status === 'sent') summary.day_before.contractor_sent++
            else                     summary.day_before.contractor_skipped++
          }
        }
      }
    }
  } catch (e) {
    summary.errors.push(`day_before: ${(e as Error).message}`)
  }

  // ════ Task B — Overdue invoice reminders ═══════════════════════
  try {
    const today = nzDateString(0)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, due_date, base_price, discount, share_token, client_id, deleted_at,
        invoice_items ( price ),
        clients ( name, phone )
      `)
      .eq('status', 'sent')
      .lt('due_date', today)
      .is('deleted_at', null)

    if (invErr) {
      summary.errors.push(`overdue query: ${invErr.message}`)
    } else if (invoices) {
      summary.overdue.invoices_scanned = invoices.length
      const nowMs = Date.now()

      for (const inv of invoices) {
        if (!inv.client_id || !inv.clients) {
          summary.overdue.skipped++
          continue
        }

        // Cadence is derived entirely from notification_logs.
        const { data: priors } = await supabase
          .from('notification_logs')
          .select('sent_at')
          .eq('type', 'payment_reminder')
          .eq('related_invoice_id', inv.id)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })

        const priorCount = priors?.length ?? 0
        if (priorCount >= 3) {
          summary.overdue.skipped++
          continue
        }

        const dueMs       = new Date(inv.due_date + 'T00:00:00Z').getTime()
        const daysOverdue = Math.floor((nowMs - dueMs) / 86400000)

        let shouldSend = false
        if (priorCount === 0) {
          shouldSend = daysOverdue >= 3
        } else {
          const lastSent = priors?.[0]?.sent_at
          if (lastSent) {
            const daysSinceLast = Math.floor((nowMs - new Date(lastSent).getTime()) / 86400000)
            shouldSend = daysSinceLast >= 7
          }
        }
        if (!shouldSend) {
          summary.overdue.skipped++
          continue
        }

        const client = inv.clients as unknown as { name: string | null; phone: string | null }
        const items  = (inv.invoice_items ?? []) as { price: number }[]
        const addOns = items.reduce((s, i) => s + (i.price ?? 0), 0)
        const total  = (inv.base_price ?? 0) + addOns - (inv.discount ?? 0)

        const invoiceLink = inv.share_token && siteUrl
          ? `${siteUrl}/share/invoice/${inv.share_token}`
          : ''

        const r = await sendNotification(supabase, {
          type: 'payment_reminder',
          channel: 'sms',
          audience: 'customer',
          source: 'automated',
          recipientName: client.name,
          recipientPhone: client.phone,
          variables: {
            client_name:    (client.name ?? '').split(/\s+/)[0],
            invoice_number: inv.invoice_number,
            invoice_total:  total.toFixed(2),
            due_date:       fmtFullDateNZ(inv.due_date),
            invoice_link:   invoiceLink,
            business_name:  BUSINESS_NAME,
            business_phone: BUSINESS_PHONE,
          },
          clientId:  inv.client_id,
          invoiceId: inv.id,
        })
        if (r.status === 'sent') summary.overdue.sent++
        else                     summary.overdue.skipped++
      }
    }
  } catch (e) {
    summary.errors.push(`overdue: ${(e as Error).message}`)
  }

  return NextResponse.json({ ok: summary.errors.length === 0, summary })
}

export async function POST(request: NextRequest) { return runDaily(request) }
export async function GET (request: NextRequest) { return runDaily(request) }
