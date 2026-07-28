import { parseCookieHeader } from '@/lib/pdf/render-pdf'

describe('parseCookieHeader', () => {
  it('returns an empty array for an empty header', () => {
    expect(parseCookieHeader('', 'https://sano.nz')).toEqual([])
  })

  it('parses a single cookie', () => {
    expect(parseCookieHeader('sb-access-token=abc123', 'https://sano.nz')).toEqual([
      { name: 'sb-access-token', value: 'abc123', url: 'https://sano.nz' },
    ])
  })

  it('parses multiple semicolon-separated cookies', () => {
    expect(parseCookieHeader('a=1; b=2; c=3', 'https://sano.nz')).toEqual([
      { name: 'a', value: '1', url: 'https://sano.nz' },
      { name: 'b', value: '2', url: 'https://sano.nz' },
      { name: 'c', value: '3', url: 'https://sano.nz' },
    ])
  })

  it('skips malformed pairs without an equals sign', () => {
    expect(parseCookieHeader('a=1; broken; b=2', 'https://sano.nz')).toEqual([
      { name: 'a', value: '1', url: 'https://sano.nz' },
      { name: 'b', value: '2', url: 'https://sano.nz' },
    ])
  })

  it('preserves values containing equals signs (e.g. base64)', () => {
    expect(parseCookieHeader('sb=abc=def==', 'https://sano.nz')).toEqual([
      { name: 'sb', value: 'abc=def==', url: 'https://sano.nz' },
    ])
  })

  it('uses the provided origin even for localhost (the bug this fix addresses)', () => {
    expect(parseCookieHeader('a=1', 'http://localhost:3000')).toEqual([
      { name: 'a', value: '1', url: 'http://localhost:3000' },
    ])
  })
})

jest.mock('puppeteer-core', () => {
  const mockPage = {
    setCookie: jest.fn().mockResolvedValue(undefined),
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn(),
    evaluate: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(new Uint8Array([0x50, 0x44, 0x46])),
  }
  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
  }
  // Attach `__mocks` to the default export so the test code can reach
  // it via the same `import puppeteer from 'puppeteer-core'` it uses
  // for `puppeteer.launch`. Without this the default import strips
  // module-level properties.
  return {
    __esModule: true,
    default: {
      launch: jest.fn().mockResolvedValue(mockBrowser),
      __mocks: { mockPage, mockBrowser },
    },
  }
})
jest.mock('@sparticuz/chromium', () => ({
  __esModule: true,
  default: {
    args: ['--mock-arg'],
    executablePath: jest.fn().mockResolvedValue('/mock/chromium'),
  },
}))

import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import puppeteer from 'puppeteer-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __mocks = (puppeteer as any).__mocks

beforeEach(() => {
  __mocks.mockPage.setCookie.mockClear()
  __mocks.mockPage.emulateMediaType.mockClear()
  __mocks.mockPage.goto.mockReset()
  __mocks.mockPage.evaluate.mockClear()
  __mocks.mockPage.pdf.mockReset()
  __mocks.mockPage.pdf.mockResolvedValue(new Uint8Array([0x50, 0x44, 0x46]))
  __mocks.mockBrowser.newPage.mockClear()
  __mocks.mockBrowser.close.mockClear()
  ;(puppeteer.launch as jest.Mock).mockClear()
})

describe('renderPdfFromUrl', () => {
  it('sets cookies BEFORE navigation, emulates print media, and captures A4 PDF', async () => {
    __mocks.mockPage.goto.mockResolvedValue({ ok: () => true, status: () => 200 })
    const cookies = [{ name: 'sb', value: 'tok', url: 'https://sano.nz' }]

    const buf = await renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', { cookies })

    // Cookie set before goto
    const setCookieOrder = __mocks.mockPage.setCookie.mock.invocationCallOrder[0]
    const gotoOrder = __mocks.mockPage.goto.mock.invocationCallOrder[0]
    expect(setCookieOrder).toBeLessThan(gotoOrder)

    // Print media emulated
    expect(__mocks.mockPage.emulateMediaType).toHaveBeenCalledWith('print')

    // PDF options correct
    expect(__mocks.mockPage.pdf).toHaveBeenCalledWith({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    // Browser closed
    expect(__mocks.mockBrowser.close).toHaveBeenCalledTimes(1)

    // Returns a Buffer
    expect(Buffer.isBuffer(buf)).toBe(true)
  })

  it('throws RenderPdfError(502) when navigation returns non-2xx', async () => {
    __mocks.mockPage.goto.mockResolvedValue({ ok: () => false, status: () => 500 })

    await expect(
      renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', {}),
    ).rejects.toMatchObject({ name: 'RenderPdfError', status: 502 })

    expect(__mocks.mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when navigation throws', async () => {
    __mocks.mockPage.goto.mockRejectedValue(new Error('network'))

    await expect(
      renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', {}),
    ).rejects.toThrow('network')

    expect(__mocks.mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('does not call setCookie when cookies array is empty', async () => {
    __mocks.mockPage.goto.mockResolvedValue({ ok: () => true, status: () => 200 })

    await renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', { cookies: [] })

    expect(__mocks.mockPage.setCookie).not.toHaveBeenCalled()
    expect(__mocks.mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('default (no anchor) captures once and never touches the DOM', async () => {
    __mocks.mockPage.goto.mockResolvedValue({ ok: () => true, status: () => 200 })

    await renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', {})

    expect(__mocks.mockPage.pdf).toHaveBeenCalledTimes(1)
    expect(__mocks.mockPage.evaluate).not.toHaveBeenCalled()
  })

  describe('anchorClosingBlock', () => {
    // Build a fake PDF whose page count the counter can read: embed `/Count N`.
    const pdfWith = (pages: number) =>
      Buffer.from(`%PDF-1.4\n/Type /Pages /Count ${pages}\n%%EOF`, 'latin1')

    it('binary-searches the spacer and returns the render that stays at the natural page count', async () => {
      __mocks.mockPage.goto.mockResolvedValue({ ok: () => true, status: () => 200 })
      // Natural (spacer 0) = 2 pages. As the spacer grows past a threshold it
      // spills to 3 pages; the anchorer must reject those and keep a 2-page one.
      // We drive page count off the spacer value the code sets via evaluate.
      let lastSpacer = 0
      __mocks.mockPage.evaluate.mockImplementation(async (_fn: unknown, px: number) => {
        lastSpacer = px
        return undefined
      })
      __mocks.mockPage.pdf.mockImplementation(async () =>
        pdfWith(lastSpacer > 600 ? 3 : 2),
      )

      const buf = await renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', {
        anchorClosingBlock: true,
      })

      // The returned PDF must be a 2-page one (never the 3-page overflow).
      expect(buf.toString('latin1')).toContain('/Count 2')
      // It must have iterated (multiple renders) and adjusted the spacer.
      expect(__mocks.mockPage.pdf.mock.calls.length).toBeGreaterThan(1)
      expect(__mocks.mockPage.evaluate).toHaveBeenCalled()
      // Iteration is capped — must not blow past a sane render budget.
      expect(__mocks.mockPage.pdf.mock.calls.length).toBeLessThanOrEqual(14)
      expect(__mocks.mockBrowser.close).toHaveBeenCalledTimes(1)
    })

    it('falls back to the spacer-free render when any spacer would add a page', async () => {
      __mocks.mockPage.goto.mockResolvedValue({ ok: () => true, status: () => 200 })
      // Natural = 2 pages, but ANY positive spacer overflows to 3. The anchorer
      // must keep best=0 and return the natural render (no blank page).
      let lastSpacer = 0
      __mocks.mockPage.evaluate.mockImplementation(async (_fn: unknown, px: number) => {
        lastSpacer = px
        return undefined
      })
      __mocks.mockPage.pdf.mockImplementation(async () => pdfWith(lastSpacer > 0 ? 3 : 2))

      const buf = await renderPdfFromUrl('https://sano.nz/portal/quotes/1/print', {
        anchorClosingBlock: true,
      })

      expect(buf.toString('latin1')).toContain('/Count 2')
    })
  })
})
