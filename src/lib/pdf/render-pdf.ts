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

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    return Buffer.from(pdfBytes)
  } finally {
    if (browser) await browser.close()
  }
}
