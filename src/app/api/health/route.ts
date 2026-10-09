// Liveness probe for uptime monitoring (Better Stack / UptimeRobot).
//
// Deliberately dependency-free: NO Supabase, auth, env reads, or external
// calls. It exists purely to confirm the SSR Lambda is reachable and
// executing — the exact failure mode of the 2026-05-31 incident, where
// dynamic routes 500'd while static files still served 200. A monitor on
// `/api/health` catches that; a monitor on `/` (static) would not.
//
// `force-dynamic` guarantees this is never statically pre-rendered or cached,
// so a green check means the function actually ran just now.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Commit of this build, inlined at build time via next.config `env` (no
// runtime env read). Lets the post-deploy smoke check wait for THIS deploy.
const COMMIT = process.env.BUILD_COMMIT || null

export async function GET() {
  return NextResponse.json(
    { ok: true, commit: COMMIT },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  )
}
