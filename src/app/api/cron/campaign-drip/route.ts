// Campaign drip cron — sender warm-up. Once per day, for each 'sending' campaign
// that has a daily_send_cap and hasn't sent a batch yet today, send the next
// batch (up to the cap, best leads A→B→C first). When a campaign runs out of
// pending recipients it flips to 'sent'.
//
// Invoked by a Netlify Scheduled Function. Auth: Bearer must equal CRON_SECRET.
// Uses the service-role client (no user session).

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sendCampaignBatch, sendFollowupBatch, isCampaignSendDay } from '@/lib/campaigns/send-batch'

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

  // Campaign email only goes out Mon–Thu (NZ). On Fri/Sat/Sun the cron no-ops.
  if (!isCampaignSendDay(now)) {
    return NextResponse.json({ ok: true, skipped: 'not a campaign send day (Mon–Thu only)' })
  }

  // Campaigns with anything left to do: still 'sending' (intro drip) OR 'sent'
  // (intro done, but follow-ups may be due). Only capped campaigns drip.
  const { data: campaigns, error } = await supabase
    .from('sales_campaigns')
    .select('id, name, status, daily_send_cap, last_batch_at')
    .in('status', ['sending', 'sent'])
    .gt('daily_send_cap', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const summary: Array<Record<string, unknown>> = []

  for (const c of campaigns ?? []) {
    const cap = Number((c as { daily_send_cap?: number | null }).daily_send_cap ?? 0)
    const alreadyToday = sameNzDay((c as { last_batch_at?: string | null }).last_batch_at ?? null, nowIso)
    const row: Record<string, unknown> = { campaign: c.name }

    // 1) Intro drip (only while still 'sending', one batch/day).
    if (c.status === 'sending' && !alreadyToday) {
      const { result, error: sErr } = await sendCampaignBatch(supabase, c.id as string, { limit: cap })
      if (sErr) { row.introError = sErr }
      else {
        const done = (result?.remaining ?? 0) <= 0
        await supabase.from('sales_campaigns')
          .update(done ? { status: 'sent', sent_at: nowIso, last_batch_at: nowIso } : { last_batch_at: nowIso })
          .eq('id', c.id)
        row.intro = { sent: result?.sent, remaining: result?.remaining, done }
      }
    } else if (c.status === 'sending' && alreadyToday) {
      row.intro = 'already sent a batch today'
    }

    // 2) Follow-ups (one each, 5+ business days after intro, delivered/no-reply).
    //    Shares the same daily cap so total daily volume stays warm-up-safe.
    const { result: fu, error: fErr } = await sendFollowupBatch(supabase, c.id as string, { limit: cap, now })
    if (fErr) row.followupError = fErr
    else if ((fu?.sent ?? 0) > 0 || (fu?.remaining ?? 0) > 0) row.followup = { sent: fu?.sent, remaining: fu?.remaining }

    summary.push(row)
  }

  return NextResponse.json({ ok: true, ran: (campaigns ?? []).length, summary })
}

export async function GET(request: NextRequest) { return runDrip(request) }
export async function POST(request: NextRequest) { return runDrip(request) }
