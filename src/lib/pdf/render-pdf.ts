// Shared Puppeteer plumbing. Extracted from
// /api/proposals/[id]/pdf so all PDF routes (staff & share, quote &
// invoice) and the send-email server actions go through the same
// boot → navigate → capture → close path.
//
// Design notes:
//   • Caller passes an absolute URL. The renderer does not synthesise
//     origin from request headers — keeps it usable from server
//     actions where there is no incoming request.
//   • Caller passes cookies for staff routes (forwarded so the
//     destination print page sees the staff Supabase session). Public
//     share routes pass no cookies.
//   • emulateMediaType('print') is set unconditionally so any future
//     `@media print { display: none }` rules survive the snapshot.

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export interface PuppeteerCookie {
  name: string
  value: string
  url: string
}

export function parseCookieHeader(header: string, originUrl: string): PuppeteerCookie[] {
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
    out.push({ name, value, url: originUrl })
  }
  return out
}

async function resolveBrowser() {
  // Respect PUPPETEER_EXECUTABLE_PATH whenever set — works on Windows /
  // macOS / Linux dev. Production (Netlify Functions / Lambda) does not
  // set this env var, so the fall-through always picks @sparticuz/chromium
  // there.
  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH
  if (localPath) {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: localPath,
    })
  }

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
}

export interface RenderPdfOptions {
  cookies?: PuppeteerCookie[]
  navigationTimeoutMs?: number
  /**
   * Quote / invoice documents only. When true, after the page loads the
   * renderer grows the document's `.doc-endspacer` element so the closing
   * block (`.doc-closing` — subtotal, GST, total, terms, footer) is pushed to
   * the bottom of the final page, without adding a page. See
   * `anchorClosingBlock` below for the algorithm. Off by default, so every
   * other PDF route is unaffected.
   */
  anchorClosingBlock?: boolean
}

// A4 page count from raw PDF bytes — the pages tree `/Count`, falling back to
// counting page objects. Used to compare renders while anchoring.
function pdfPageCount(buf: Buffer): number {
  const s = buf.toString('latin1')
  const m = s.match(/\/Count\s+(\d+)/)
  if (m) return parseInt(m[1], 10)
  return (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length
}

/**
 * Anchor the `.doc-closing` block to the bottom of the document's final page.
 *
 * We cannot compute the target spacer height from the page's own JS: a
 * `break-inside: avoid` closing block that moves to the next page leaves a gap
 * that does NOT change the DOM's continuous height, so `getBoundingClientRect`
 * / `scrollHeight` misreport the real page count. The only reliable pagination
 * signal is the actual rendered PDF. So we render, count real pages, adjust the
 * spacer, and re-render — a binary search for the largest spacer that keeps the
 * page count at its natural (spacer-free) value. At that maximum the closing
 * block sits flush at the bottom of its final page.
 *
 * Controls (per the fix spec):
 *   • Iteration cap: MAX_ITERS renders (cannot loop indefinitely).
 *   • Adjustment: binary search over [0, one page height] — controlled,
 *     converging increments.
 *   • Guard after every step: the REAL rendered page count.
 *   • Stop: when the search window closes or the cap is hit; we keep the best
 *     render seen (largest spacer that didn't add a page).
 *   • Fallback: if no better-than-zero render is found, return the spacer-free
 *     render (closing block immediately after content — never a blank page,
 *     never clipped).
 */
async function anchorClosingBlock(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>>,
  basePdf: (spacerPx: number) => Promise<Buffer>,
): Promise<Buffer> {
  const MAX_ITERS = 12
  const ONE_PAGE_PX = 1123 // A4 @ 96dpi; only the search upper bound, not a layout constant

  // Baseline render with no spacer — defines the natural page count and is the
  // safe fallback.
  const naturalPdf = await basePdf(0)
  const naturalPages = pdfPageCount(naturalPdf)

  let lo = 0
  let hi = ONE_PAGE_PX
  let best = 0
  let bestPdf = naturalPdf

  for (let i = 0; i < MAX_ITERS && lo <= hi; i++) {
    const mid = Math.floor((lo + hi) / 2)
    if (mid === 0) break
    const pdf = await basePdf(mid)
    if (pdfPageCount(pdf) > naturalPages) {
      hi = mid - 1 // this spacer spilled onto a new page — reduce
    } else {
      best = mid // fits — keep it and try to push further down
      bestPdf = pdf
      lo = mid + 1
    }
  }

  void best
  return bestPdf
}

export class RenderPdfError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'RenderPdfError'
  }
}

export async function renderPdfFromUrl(
  targetUrl: string,
  opts: RenderPdfOptions = {},
): Promise<Buffer> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await resolveBrowser()
    const page = await browser.newPage()

    if (opts.cookies && opts.cookies.length > 0) {
      await page.setCookie(...opts.cookies)
    }

    await page.emulateMediaType('print')

    const navResponse = await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: opts.navigationTimeoutMs ?? 30_000,
    })

    if (!navResponse || !navResponse.ok()) {
      const status = navResponse?.status() ?? 0
      throw new RenderPdfError(`Print route returned ${status}`, 502)
    }

    const capture = async (): Promise<Buffer> => {
      const bytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      })
      return Buffer.from(bytes)
    }

    // Default path: single capture, no DOM interaction — every non
    // quote/invoice route is completely unaffected.
    if (!opts.anchorClosingBlock) {
      return await capture()
    }

    // Anchor path (quote/invoice): render at a given spacer height, then let
    // anchorClosingBlock binary-search for the value that pins the closing
    // block to the bottom of the final page.
    const renderAt = async (spacerPx: number): Promise<Buffer> => {
      await page.evaluate((px) => {
        const el = document.querySelector('.doc-endspacer') as HTMLElement | null
        if (el) el.style.height = `${px}px`
      }, spacerPx)
      return capture()
    }
    return await anchorClosingBlock(page, renderAt)
  } finally {
    if (browser) await browser.close()
  }
}
