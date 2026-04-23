// Proposal Phase 2.3 — server-side PDF generation via Puppeteer.
//
// GET /api/proposals/[id]/pdf
//   • Auth-gated to authenticated staff (mirrors the preview route).
//   • Loads the same payload via loadProposalForQuote — preview and
//     PDF are byte-equivalent in their data path.
//   • Renders <ProposalDocument /> server-side via renderToStaticMarkup.
//   • Wraps in a full HTML doc with <base href> so /images/* and
//     /brand/* resolve back to this same Next.js server, plus a
//     Google Fonts <link> for Inter.
//   • Launches Puppeteer, page.setContent(html), page.pdf({format: 'A4'}).
//   • Returns the buffer with Content-Disposition: attachment.
//
// Why setContent instead of page.goto(previewUrl):
//   • No need to forward Supabase auth cookies into headless Chromium.
//   • One fewer HTTP round-trip.
//   • Easier to add a <base> for image resolution.
//
// Deployment note (see end-of-phase summary):
//   This file imports `puppeteer` (full, with bundled Chromium). Works
//   locally and in any container with Chromium dependencies installed.
//   For Netlify Functions / Vercel serverless, swap to puppeteer-core
//   + @sparticuz/chromium per the phase-summary instructions.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import puppeteer from 'puppeteer'
import { ProposalDocument } from '@/components/proposals/ProposalDocument'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'

export const dynamic = 'force-dynamic'
// PDF generation is slow — bump the route timeout. Default Vercel
// limit is 10s; this opts into 60s on platforms that respect it.
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  // Auth gate — same shape as the preview route.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Build the proposal payload.
  const result = await loadProposalForQuote(supabase, params.id)
  if (!result) {
    return NextResponse.json(
      { error: 'Proposal not available for this quote' },
      { status: 404 },
    )
  }

  // Render the React tree to an HTML string. ProposalDocument is a
  // server component that already injects the proposal CSS via a
  // <style> tag, so the resulting markup is self-contained styling-wise.
  const reactHtml = renderToStaticMarkup(
    createElement(ProposalDocument, { payload: result.payload }),
  )

  // Wrap in a full HTML doc so Puppeteer renders cleanly.
  //   • <base href> makes the existing /images/* and /brand/* paths
  //     resolve back to this Next.js server during rendering.
  //   • Inter font preconnect + stylesheet — the proposal CSS uses
  //     Inter as its primary font; without this, headless Chromium
  //     falls back to the secondary 'Arial' which slightly changes
  //     metrics.
  const origin = new URL(request.url).origin
  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>${reactHtml}</body>
</html>`

  // Launch headless Chromium and render to PDF.
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()

    // setContent + waitUntil 'networkidle0' so background images and
    // the Inter stylesheet finish loading before the PDF snapshot.
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // preferCSSPageSize lets the proposal-styles.ts @page { size: A4 }
    // rule control the sheet size; format: 'A4' is a fallback.
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const filename = `proposal-${result.quoteNumber}.pdf`.replace(/[^\w.\-]+/g, '_')

    // Wrap in Buffer so NextResponse's BodyInit accepts it cleanly
    // (puppeteer 24 returns Uint8Array<ArrayBufferLike> which the
    // strict typing on Response doesn't match directly).
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
