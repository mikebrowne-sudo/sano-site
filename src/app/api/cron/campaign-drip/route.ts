// Campaign drip cron — sender warm-up. Once per day, for each 'sending' campaign
// that has a daily_send_cap and hasn't sent a batch yet today, send the next
// batch (up to the cap, best leads A→B→C first). When a campaign runs out of
// pending recipients it flips to 'sent'.
//
// Invoked by a Netlify Scheduled Function. Auth: Bearer must equal CRON_SECRET.
// Uses the service-role client (no user session).

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sendCampaignBatch, sendFollowupBatch, isCampaignDueNow } from '@/lib/campaigns/send-batch'

export const dynamic = 'force-dynamic'

function sameNzDay(a: string | null, nowIso: string): boolean {
  if (!a) return false
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })
  return day(a) === day(nowIso)
}

async function runDrip(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const now = new Date()
  const nowIso = now.toISOString()

  // Campaigns with anything left to do: 'scheduled' (armed, not started),
  // 'sending' (intro drip in progress) OR 'sent' (intro done, follow-ups may be
  // due). Paused campaigns are excluded. Per-campaign scheduling (start date /
  // send time / sending days) is evaluated below, not globally.
  const { data: campaigns, error } = await supabase
    .from('sales_campaigns')
    .select('id, name, status, daily_send_cap, last_batch_at, followups_enabled, start_date, send_time_nz, sending_days, paused_at')
    .in('status', ['scheduled', 'sending', 'sent'])
    .is('paused_at', null)
    .gt('daily_send_cap', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const summary: Array<Record<string, unknown>> = []

  for (const c of campaigns ?? []) {
    const cap = Number((c as { daily_send_cap?: number | null }).daily_send_cap ?? 0)
    const alreadyToday = sameNzDay((c as { last_batch_at?: string | null }).last_batch_at ?? null, nowIso)
    const row: Record<string, unknown> = { campaign: c.name }

    const schedule = {
      status: c.status as string,
      startDate: (c as { start_date?: string | null }).start_date ?? null,
      sendTimeNz: (c as { send_time_nz?: string | null }).send_time_nz ?? null,
      sendingDays: (c as { sending_days?: number[] | null }).sending_days ?? null,
      pausedAt: (c as { paused_at?: string | null }).paused_at ?? null,
    }
    const dueNow = isCampaignDueNow(schedule, now)

    // 1) Intro drip: only for an armed campaign ('scheduled'/'sending') that is
    //    due now (start date reached, sending day, past send time) and hasn't
    //    already sent a batch today. A 'scheduled' campaign flips to 'sending'
    //    once its first batch goes out.
    if ((c.status === 'scheduled' || c.status === 'sending') && dueNow && !alreadyToday) {
      const { result, error: sErr } = await sendCampaignBatch(supabase, c.id as string, { limit: cap })
      if (sErr) { row.introError = sErr }
      else {
        const done = (result?.remaining ?? 0) <= 0
        await supabase.from('sales_campaigns')
          .update(done
            ? { status: 'sent', sent_at: nowIso, last_batch_at: nowIso }
            : { status: 'sending', last_batch_at: nowIso })
          .eq('id', c.id)
        row.intro = { sent: result?.sent, remaining: result?.remaining, done }
      }
    } else if ((c.status === 'scheduled' || c.status === 'sending') && !dueNow) {
      row.intro = 'not due now (schedule / send window)'
    } else if (c.status === 'sending' && alreadyToday) {
      row.intro = 'already sent a batch today'
    }

    // 2) Follow-ups (one each, 5+ business days after intro, delivered/no-reply).
    //    Shares the same daily cap so total daily volume stays warm-up-safe.
    //    ONLY when this specific campaign has follow-ups explicitly enabled
    //    (defaults off) AND the campaign is due now (same schedule/window as the
    //    intro drip — so follow-ups also respect sending days + send time + pause).
    if (!(c as { followups_enabled?: boolean }).followups_enabled) {
      row.followup = 'disabled for this campaign'
    } else if (!dueNow) {
      row.followup = 'not due now (schedule / send window)'
    } else {
      const { result: fu, error: fErr } = await sendFollowupBatch(supabase, c.id as string, { limit: cap, now })
      if (fErr) row.followupError = fErr
      else if ((fu?.sent ?? 0) > 0 || (fu?.remaining ?? 0) > 0) row.followup = { sent: fu?.sent, remaining: fu?.remaining }
    }

    summary.push(row)
  }

  return NextResponse.json({ ok: true, ran: (campaigns ?? []).length, summary })
}

export async function GET(request: NextRequest) { return runDrip(request) }
export async function POST(request: NextRequest) { return runDrip(request) }
