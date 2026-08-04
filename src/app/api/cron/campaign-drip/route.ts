// Campaign drip cron — sender warm-up. Once per day, for each 'sending' campaign
// that has a daily_send_cap and hasn't sent a batch yet today, send the next
// batch (up to the cap, best leads A→B→C first). When a campaign runs out of
// pending recipients it flips to 'sent'.
//
// Invoked by a Netlify Scheduled Function. Auth: Bearer must equal CRON_SECRET.
// Uses the service-role client (no user session).

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sendCampaignBatch } from '@/lib/campaigns/send-batch'

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
  const nowIso = new Date().toISOString()

  // Active drip campaigns: still sending, with a daily cap set.
  const { data: campaigns, error } = await supabase
    .from('sales_campaigns')
    .select('id, name, daily_send_cap, last_batch_at')
    .eq('status', 'sending')
    .gt('daily_send_cap', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const summary: Array<Record<string, unknown>> = []

  for (const c of campaigns ?? []) {
    // One batch per calendar day.
    if (sameNzDay((c as { last_batch_at?: string | null }).last_batch_at ?? null, nowIso)) {
      summary.push({ campaign: c.name, skipped: 'already sent a batch today' })
      continue
    }
    const cap = Number((c as { daily_send_cap?: number | null }).daily_send_cap ?? 0)
    const { result, error: sErr } = await sendCampaignBatch(supabase, c.id as string, { limit: cap })
    if (sErr) { summary.push({ campaign: c.name, error: sErr }); continue }

    const done = (result?.remaining ?? 0) <= 0
    await supabase
      .from('sales_campaigns')
      .update(done ? { status: 'sent', sent_at: nowIso, last_batch_at: nowIso } : { last_batch_at: nowIso })
      .eq('id', c.id)

    summary.push({ campaign: c.name, sent: result?.sent, failed: result?.failed, skipped: result?.skipped, remaining: result?.remaining, done })
  }

  return NextResponse.json({ ok: true, ran: (campaigns ?? []).length, summary })
}

export async function GET(request: NextRequest) { return runDrip(request) }
export async function POST(request: NextRequest) { return runDrip(request) }
