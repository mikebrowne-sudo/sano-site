// Netlify Scheduled Function — campaign drip (sender warm-up).
//
// Thin wrapper around /api/cron/campaign-drip. The route does the work; this
// only gives Netlify a cron entry. Schedule is also declared in netlify.toml.
//
// Schedule: HOURLY (top of each hour). The route sends AT MOST one batch per
// NZ day per campaign (guarded by last_batch_at), but each campaign has its own
// send time (e.g. 12:45pm) — so the cron must run frequently enough to catch
// that window once it passes. A once-a-day 08:00 run meant any send time after
// 08:00 never fired. Hourly = the batch goes out within the hour of the chosen
// send time; the same-day guard still prevents any double-send.

export default async () => {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL
  const secret = process.env.CRON_SECRET

  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'URL / DEPLOY_URL not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  if (!secret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const res = await fetch(`${baseUrl}/api/cron/campaign-drip`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
  })
  const body = await res.text()
  return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

export const config = {
  schedule: '0 * * * *',
}
