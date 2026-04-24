// Proposal Phase 2.3 — server-side PDF generation via Puppeteer.
//
// GET /api/proposals/[id]/pdf
//   • Auth-gated to authenticated staff.
//   • Confirms the quote exists + is commercial via the shared loader
//     (returns 404 otherwise — same gate as the print route).
//   • Forwards the request's cookies into a Puppeteer browser
//     context so the print route's Supabase session is recognised.
//   • Puppeteer navigates to /proposals/print/[id] (a route OUTSIDE
//     /portal/ so it has no portal sidebar / topbar) and snapshots
//     the result to PDF.
//
// Why navigate to a print route instead of rendering React inside
// this route handler:
//   • Next.js 14 App Router rejects route handlers that import
//     react-dom/server — the previous version of this file failed
//     to build for that exact reason.
//   • Lets the print route reuse the same React tree that the
//     in-portal preview already renders, so preview + PDF stay
//     byte-equivalent by construction.
//
// Deployment caveats live at the bottom of the file in a comment.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import puppeteer from 'puppeteer'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'

export const dynamic = 'force-dynamic'
// PDF generation is slow — opt into 60s on platforms that respect this.
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  // Auth gate — must be a logged-in staff user.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Eagerly resolve the quote so we can fail fast with a clean 404
  // before paying the cost of launching Chromium. Also gives us the
  // quote_number for the download filename.
  const probe = await loadProposalForQuote(supabase, params.id)
  if (!probe) {
    return NextResponse.json(
      { error: 'Proposal not available for this quote' },
      { status: 404 },
    )
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/proposals/print/${params.id}`

  // Forward the request's cookies into Puppeteer's browser context so
  // the print route sees the same Supabase session and renders the
  // same data. We parse the Cookie header by hand — it's a simple
  // "name=value; name=value" list — then map to puppeteer's cookie
  // shape with the request hostname.
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookies = parseCookieHeader(cookieHeader, url.hostname)

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Set cookies BEFORE the first navigation so the request to the
    // print route is authenticated.
    if (cookies.length > 0) {
      await page.setCookie(...cookies)
    }

    // Navigate. waitUntil 'networkidle0' ensures background images,
    // the Inter font (loaded by the print page if needed), and any
    // late-load assets finish before the snapshot.
    const navResponse = await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    if (!navResponse || !navResponse.ok()) {
      const status = navResponse?.status() ?? 0
      return NextResponse.json(
        { error: `Print route returned ${status}` },
        { status: 502 },
      )
    }

    // preferCSSPageSize lets the proposal-styles.ts @page { size: A4 }
    // rule control the sheet size; format: 'A4' is a fallback.
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const filename = `proposal-${probe.quoteNumber}.pdf`.replace(/[^\w.\-]+/g, '_')

    // puppeteer 24 returns Uint8Array<ArrayBufferLike>; wrap in Buffer
    // so NextResponse's BodyInit type-narrows cleanly.
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  } finally {
    if (browser) await browser.close()
  }
}

// ── Helpers ────────────────────────────────────────────────────────

interface PuppeteerCookie {
  name: string
  value: string
  domain: string
  path: string
}

function parseCookieHeader(header: string, hostname: string): PuppeteerCookie[] {
  if (!header) return []
  const out: PuppeteerCookie[] = []
  for (const raw of header.split(';')) {
    const pair = raw.trim()
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (!name) continue
    out.push({ name, value, domain: hostname, path: '/' })
  }
  return out
}

// ── Deployment notes ───────────────────────────────────────────────
//
// This file imports `puppeteer` (the full package, with bundled
// Chromium ~280 MB). Works fine locally and in any container with
// Chromium dependencies installed. For Netlify Functions / Vercel
// serverless, swap to puppeteer-core + @sparticuz/chromium:
//
//   npm install puppeteer-core @sparticuz/chromium
//   npm uninstall puppeteer
//
// Then the launch block becomes:
//
//   import puppeteer from 'puppeteer-core'
//   import chromium from '@sparticuz/chromium'
//
//   browser = await puppeteer.launch({
//     args: chromium.args,
//     executablePath: await chromium.executablePath(),
//     headless: chromium.headless,
//   })
//
// Netlify Functions default to a 10s timeout; this route declares
// maxDuration = 60. For long renders, switch to a Background
// Function or upgrade plan.
