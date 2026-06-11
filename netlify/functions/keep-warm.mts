// Keep-warm — Netlify Scheduled Function.
//
// Cold starts (~3.5s) hit the FIRST portal request after the SSR Lambda
// goes idle, then it's snappy. This pings a lightweight *dynamic* portal
// route every 5 minutes so the SSR function stays warm, killing the
// intermittent "first click is slow" lag. No app logic — just a heartbeat.
//
// Why /portal/login: it's a dynamic route (middleware + render), so it
// runs through the same SSR function that serves the authenticated portal
// pages. Static marketing pages are served from the CDN and wouldn't keep
// the function warm. Unauthenticated, so it does minimal work.
//
// Caveat: this keeps ONE instance warm. Under concurrent load Netlify may
// spin up more (which start cold), but for a small internal team a single
// warm instance covers the common "first click of the session" case.
//
// Schedule: every 5 minutes (also mirrored in netlify.toml). Lambdas stay
// warm ~5-15 min after an invocation, so a 5-minute heartbeat keeps it hot.

export default async () => {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL
  if (!baseUrl) {
    return new Response(JSON.stringify({ skipped: 'no base URL' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(`${baseUrl}/portal/login`, {
      method: 'GET',
      headers: { 'x-keep-warm': '1' },
      redirect: 'manual',
    })
    return new Response(JSON.stringify({ ok: true, status: res.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // A missed warm-up is harmless — never fail loudly.
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  schedule: '*/5 * * * *',
}
