// Netlify Scheduled Function — daily campaign drip (sender warm-up).
//
// Thin wrapper around /api/cron/campaign-drip. The route does the work; this
// only gives Netlify a cron entry. Schedule is also declared in netlify.toml.
//
// Schedule: 0 20 UTC daily = 08:00 NZST / 09:00 NZDT — a bit before the daily
// notifications cron, and a business-hours-ish send time.

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
  schedule: '0 20 * * *',
}
