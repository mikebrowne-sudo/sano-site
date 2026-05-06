# Quote & Invoice PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship server-rendered PDF download for residential quotes and invoices (staff + public-share endpoints), and auto-attach the share-page PDF to the existing Send Quote / Send Invoice emails with fail-fast error handling.

**Architecture:** Mirror the existing `/api/proposals/[id]/pdf` Puppeteer pattern. Extract its boot-navigate-capture body into a shared helper used by all four new routes, the existing proposal route, and the two send-email server actions. Customer-facing PDFs are rendered from `/share/{quote|invoice}/[token]?pdf=1`, a new mode on the share pages that hides interactive panels, suppresses the `<AutoPrint>` mount, and short-circuits the `sent → viewed` status side-effect on the quote share page.

**Tech Stack:** Next.js 14 App Router · `puppeteer-core` + `@sparticuz/chromium` · Resend · Jest + React Testing Library · Supabase (Postgres + Auth)

**Spec:** `docs/superpowers/specs/2026-05-06-quote-invoice-pdf-design.md`

---

## File Structure

### Created

| File | Responsibility |
|---|---|
| `src/lib/pdf/sanitize-filename.ts` | One pure helper: `sanitizePdfFilename(stem)` |
| `src/lib/pdf/render-pdf.ts` | Shared Puppeteer plumbing: `renderPdfFromUrl(url, opts) → Buffer` and `parseCookieHeader(header, hostname)` |
| `src/lib/__tests__/sanitize-filename.test.ts` | Unit tests for the filename helper |
| `src/lib/__tests__/render-pdf.test.ts` | Unit tests for cookie-header parser (renderer body is mocked at integration level) |
| `src/app/api/quotes/[id]/pdf/route.ts` | Staff residential-quote PDF |
| `src/app/api/invoices/[id]/pdf/route.ts` | Staff invoice PDF |
| `src/app/api/share/quote/[token]/pdf/route.ts` | Public quote PDF via share token |
| `src/app/api/share/invoice/[token]/pdf/route.ts` | Public invoice PDF via share token |
| `src/__tests__/api/quote-pdf.test.ts` | Staff & share quote-PDF route tests |
| `src/__tests__/api/invoice-pdf.test.ts` | Staff & share invoice-PDF route tests |
| `src/app/portal/quotes/[id]/_components/DownloadPdfButton.tsx` | Client island that triggers a clean download via a hidden `<a download>` |
| `src/app/share/_components/SharePdfButton.tsx` | Same shape, surface inside the share pages |

### Modified

| File | What changes |
|---|---|
| `src/app/api/proposals/[id]/pdf/route.ts` | Refactored to call `renderPdfFromUrl`; behaviour preserved byte-for-byte |
| `src/app/portal/quotes/[id]/print/page.tsx` | Static `metadata` → async `generateMetadata`; page-break CSS additions |
| `src/app/portal/invoices/[id]/print/page.tsx` | Same — async metadata + page-break CSS |
| `src/app/share/quote/[token]/page.tsx` | Async metadata; honour `?pdf=1` (hide `<AcceptQuote>`, skip `<AutoPrint>`, skip status promote + audit row); page-break CSS |
| `src/app/share/invoice/[token]/page.tsx` | Async metadata; honour `?pdf=1` (hide `<PayNowButton>`, skip `<AutoPrint>`); page-break CSS |
| `src/app/portal/quotes/[id]/_components/QuoteActionBar.tsx` | Add `<DownloadPdfButton>` next to the existing Preview link in `Draft` and `Sent/Viewed` action sets (residential only) |
| `src/app/portal/invoices/[id]/page.tsx` | Rename "Print / PDF" link to "Preview Invoice" + add `<DownloadPdfButton>` |
| `src/app/portal/quotes/[id]/_actions.ts` | `sendQuoteEmail` renders share PDF + attaches; fail-fast |
| `src/app/portal/invoices/[id]/_actions.ts` | `sendInvoiceEmail` renders share PDF + attaches; fail-fast |
| `docs/PORTAL.md` | Add "Phase J — Quote & Invoice PDF" section + active-work pointer |

---

## Hard Stops (read before proceeding past each one)

**HS-1 — after Task 1.3 (renderer extraction).** Do not proceed to Phase 2 until you have manually confirmed the existing `/api/proposals/[id]/pdf` still produces the same PDF on a real commercial quote. The proposal pack is a live, working flow — a regression here is the highest-risk outcome of the whole project.

**HS-2 — after Phase 5 (all four PDF routes shipped + buttons wired).** Do not proceed to Phase 6 (email auto-attach) until: (a) you have downloaded a quote PDF and an invoice PDF as staff; (b) you have downloaded the same docs from the public share link; (c) the filenames are exactly `Sano Quote - QT-xxxx.pdf` and `Sano Tax Invoice - INV-xxxx.pdf` in all four cases; (d) you have confirmed `?pdf=1` does NOT promote a `sent` quote to `viewed`. Email send is the most user-visible failure mode in this project; do not change it until the underlying renderer is proven on live data.

---

## Phase 1 — Foundations (filename sanitiser + shared renderer)

### Task 1.1: `sanitizePdfFilename` helper with tests

**Files:**
- Create: `src/lib/pdf/sanitize-filename.ts`
- Create: `src/lib/__tests__/sanitize-filename.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/sanitize-filename.test.ts`:

```typescript
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'

describe('sanitizePdfFilename', () => {
  it('returns a clean stem for a typical quote-style title', () => {
    expect(sanitizePdfFilename('Sano Quote - QT-1234')).toBe('Sano Quote - QT-1234')
  })

  it('replaces unsupported characters with underscore', () => {
    expect(sanitizePdfFilename('Sano/Quote*?\\:|<>"#$&')).toBe('Sano_Quote________________')
  })

  it('strips ASCII control characters', () => {
    expect(sanitizePdfFilename('Sano\x00Quote\x1f-1')).toBe('Sano_Quote_-1')
  })

  it('collapses runs of whitespace to a single space', () => {
    expect(sanitizePdfFilename('Sano   Quote\t\t- 1')).toBe('Sano Quote - 1')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizePdfFilename('   Sano Quote - 1   ')).toBe('Sano Quote - 1')
  })

  it('preserves the en-dash-style hyphen, dots, and underscores', () => {
    expect(sanitizePdfFilename('Sano_Tax-Invoice.v2')).toBe('Sano_Tax-Invoice.v2')
  })

  it('falls back to "Sano Document" on empty input', () => {
    expect(sanitizePdfFilename('')).toBe('Sano Document')
    expect(sanitizePdfFilename('   ')).toBe('Sano Document')
    expect(sanitizePdfFilename('!!!')).toBe('Sano Document')
  })

  it('result + .pdf always matches the safe regex', () => {
    const inputs = ['Sano Quote - QT-1', 'foo/bar', '', 'a\x00b']
    for (const i of inputs) {
      const out = sanitizePdfFilename(i) + '.pdf'
      expect(out).toMatch(/^[A-Za-z0-9 .\-_]+\.pdf$/)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern sanitize-filename`
Expected: FAIL with "Cannot find module '@/lib/pdf/sanitize-filename'"

- [ ] **Step 3: Implement the helper**

`src/lib/pdf/sanitize-filename.ts`:

```typescript
const ALLOWED = /[A-Za-z0-9 .\-_]/
const FALLBACK = 'Sano Document'

export function sanitizePdfFilename(stem: string): string {
  let out = ''
  for (const ch of stem) {
    out += ALLOWED.test(ch) ? ch : '_'
  }
  out = out.replace(/\s+/g, ' ').trim()
  if (out.length === 0 || /^_+$/.test(out)) return FALLBACK
  return out
}
```

Note: the test with all symbols (`Sano/Quote*?\\:|<>"#$&`) is sanitised character-by-character — the result is `Sano_Quote________________` (one underscore per illegal char, total length matches input). The fallback path triggers on empty result OR a result that's all underscores after sanitisation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern sanitize-filename`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/sanitize-filename.ts src/lib/__tests__/sanitize-filename.test.ts
git commit -m "feat(pdf): add sanitizePdfFilename helper"
```

---

### Task 1.2: Extract `renderPdfFromUrl` shared renderer

**Files:**
- Create: `src/lib/pdf/render-pdf.ts`
- Create: `src/lib/__tests__/render-pdf.test.ts`

- [ ] **Step 1: Write the failing test for cookie-header parsing**

The Puppeteer body is too heavy to unit-test in isolation; we test the pure cookie-parsing helper that lives alongside it.

`src/lib/__tests__/render-pdf.test.ts`:

```typescript
import { parseCookieHeader } from '@/lib/pdf/render-pdf'

describe('parseCookieHeader', () => {
  it('returns an empty array for an empty header', () => {
    expect(parseCookieHeader('', 'sano.nz')).toEqual([])
  })

  it('parses a single cookie', () => {
    expect(parseCookieHeader('sb-access-token=abc123', 'sano.nz')).toEqual([
      { name: 'sb-access-token', value: 'abc123', domain: 'sano.nz', path: '/' },
    ])
  })

  it('parses multiple semicolon-separated cookies', () => {
    expect(parseCookieHeader('a=1; b=2; c=3', 'sano.nz')).toEqual([
      { name: 'a', value: '1', domain: 'sano.nz', path: '/' },
      { name: 'b', value: '2', domain: 'sano.nz', path: '/' },
      { name: 'c', value: '3', domain: 'sano.nz', path: '/' },
    ])
  })

  it('skips malformed pairs without an equals sign', () => {
    expect(parseCookieHeader('a=1; broken; b=2', 'sano.nz')).toEqual([
      { name: 'a', value: '1', domain: 'sano.nz', path: '/' },
      { name: 'b', value: '2', domain: 'sano.nz', path: '/' },
    ])
  })

  it('preserves values containing equals signs (e.g. base64)', () => {
    expect(parseCookieHeader('sb=abc=def==', 'sano.nz')).toEqual([
      { name: 'sb', value: 'abc=def==', domain: 'sano.nz', path: '/' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern render-pdf`
Expected: FAIL with "Cannot find module '@/lib/pdf/render-pdf'"

- [ ] **Step 3: Implement the helper**

`src/lib/pdf/render-pdf.ts`:

```typescript
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
  domain: string
  path: string
}

export function parseCookieHeader(header: string, hostname: string): PuppeteerCookie[] {
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

async function resolveBrowser() {
  const isDev = process.env.NODE_ENV === 'development'
  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH

  if (isDev && localPath) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern render-pdf`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/render-pdf.ts src/lib/__tests__/render-pdf.test.ts
git commit -m "feat(pdf): extract renderPdfFromUrl shared renderer"
```

---

### Task 1.3: Refactor existing proposal PDF route to use the helper

**Files:**
- Modify: `src/app/api/proposals/[id]/pdf/route.ts`

- [ ] **Step 1: Replace the inline Puppeteer body with a call to the helper**

Open `src/app/api/proposals/[id]/pdf/route.ts` and replace its contents with:

```typescript
// Proposal Phase 2.3 — server-side PDF generation.
//
// Refactored to use src/lib/pdf/render-pdf.ts so all PDF routes
// (proposals, residential quotes, invoices, public-share variants)
// share one Puppeteer code path. Behaviour is preserved byte-for-byte.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'
import {
  parseCookieHeader,
  renderPdfFromUrl,
  RenderPdfError,
} from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const probe = await loadProposalForQuote(supabase, params.id)
  if (!probe) {
    return NextResponse.json(
      { error: 'Proposal not available for this quote' },
      { status: 404 },
    )
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/proposals/print/${params.id}`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.hostname)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    const filename = `proposal-${probe.quoteNumber}.pdf`.replace(/[^\w.\-]+/g, '_')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
```

The proposal filename format (`proposal-QT-xxxx.pdf`) is intentionally NOT changed in this refactor — leaving the existing live deliverable untouched is the whole point of HS-1. The harmonisation to "Sano Proposal - QT-xxxx" is a follow-up, not part of this scope.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: PASS — full suite still green (no proposal-route tests existed before; we just confirm nothing else broke).

- [ ] **Step 3: Manual smoke (HARD STOP HS-1)**

1. Start dev server: `npm run dev`
2. Set `PUPPETEER_EXECUTABLE_PATH` in `.env.local` if not already set.
3. Open `/portal/quotes/{some-commercial-quote-id}` and click "Download PDF".
4. Verify the proposal PDF downloads and opens. It should look identical to before this refactor (typography, logos, scope grouping, T&Cs).

**Do not proceed to Phase 2 until this smoke passes.**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/proposals/[id]/pdf/route.ts
git commit -m "refactor(pdf): proposal route uses shared renderPdfFromUrl helper"
```

---

## Phase 2 — Print-page metadata + page-break CSS

### Task 2.1: Async `generateMetadata` for staff quote print page

**Files:**
- Modify: `src/app/portal/quotes/[id]/print/page.tsx`

- [ ] **Step 1: Replace the static `metadata` export with `generateMetadata`**

In `src/app/portal/quotes/[id]/print/page.tsx`, find:

```typescript
import type { Metadata } from 'next'
…
export const metadata: Metadata = { robots: 'noindex, nofollow' }
```

Replace with:

```typescript
import type { Metadata } from 'next'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
…
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('id', params.id)
    .single()
  const number = data?.quote_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Quote - ${number}`),
    robots: 'noindex, nofollow',
  }
}
```

(`sanitizePdfFilename` is reused for the title because the title gets used as the customer's saved-PDF filename when they Ctrl+P, so the same character constraints apply.)

- [ ] **Step 2: Verify in dev**

1. Start dev server: `npm run dev`
2. Open `/portal/quotes/{any-residential-quote-id}/print` in a logged-in tab.
3. Browser tab title should read `Sano Quote - QT-xxxx`.
4. Open the print preview (Ctrl+P): the auto-injected page-header at the top should now show `Sano Quote - QT-xxxx`, not the global site title.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/quotes/[id]/print/page.tsx
git commit -m "feat(quotes): set print-page title to Sano Quote - {number}"
```

---

### Task 2.2: Async `generateMetadata` for staff invoice print page

**Files:**
- Modify: `src/app/portal/invoices/[id]/print/page.tsx`

- [ ] **Step 1: Replace the static `metadata` export with `generateMetadata`**

Same pattern as Task 2.1, but invoice flavour. Replace:

```typescript
export const metadata: Metadata = { robots: 'noindex, nofollow' }
```

with:

```typescript
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
…
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('id', params.id)
    .single()
  const number = data?.invoice_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Tax Invoice - ${number}`),
    robots: 'noindex, nofollow',
  }
}
```

- [ ] **Step 2: Verify in dev**

Open `/portal/invoices/{any-invoice-id}/print`. Tab title and Ctrl+P preview header read `Sano Tax Invoice - INV-xxxx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/invoices/[id]/print/page.tsx
git commit -m "feat(invoices): set print-page title to Sano Tax Invoice - {number}"
```

---

### Task 2.3: Async `generateMetadata` for share quote page

**Files:**
- Modify: `src/app/share/quote/[token]/page.tsx`

- [ ] **Step 1: Replace the static `metadata` export with `generateMetadata`**

```typescript
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
…
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()
  const number = data?.quote_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Quote - ${number}`),
    robots: 'noindex, nofollow',
  }
}
```

- [ ] **Step 2: Verify in dev**

Open `/share/quote/{token}` (any non-deleted quote with a share_token). Tab title reads `Sano Quote - QT-xxxx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/share/quote/[token]/page.tsx
git commit -m "feat(share): set quote share-page title to Sano Quote - {number}"
```

---

### Task 2.4: Async `generateMetadata` for share invoice page

**Files:**
- Modify: `src/app/share/invoice/[token]/page.tsx`

- [ ] **Step 1: Replace the static `metadata` export with `generateMetadata`**

```typescript
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
…
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()
  const number = data?.invoice_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Tax Invoice - ${number}`),
    robots: 'noindex, nofollow',
  }
}
```

- [ ] **Step 2: Verify in dev**

Open `/share/invoice/{token}`. Tab title reads `Sano Tax Invoice - INV-xxxx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/share/invoice/[token]/page.tsx
git commit -m "feat(share): set invoice share-page title to Sano Tax Invoice - {number}"
```

---

### Task 2.5: Page-break CSS on all four print stylesheets

**Files:**
- Modify: `src/app/portal/quotes/[id]/print/page.tsx` (PRINT_CSS)
- Modify: `src/app/portal/invoices/[id]/print/page.tsx` (PRINT_CSS)
- Modify: `src/app/share/quote/[token]/page.tsx` (PRINT_CSS)
- Modify: `src/app/share/invoice/[token]/page.tsx` (PRINT_CSS)

- [ ] **Step 1: Add the rules**

In each of the four files, locate the `PRINT_CSS` template literal. Find the existing `@media print { … }` block. Just **before** that block (so the rules apply to both screen render and print), add:

```css
.print-section,
.print-pricing,
.print-totals-box,
.print-terms-section,
.print-addresses { break-inside: avoid; page-break-inside: avoid; }
.print-pricing tr { break-inside: avoid; }
```

- [ ] **Step 2: Verify in dev**

In dev, render a quote with many add-on items and a long generated-scope. Open the print page, do Ctrl+P preview, scroll to the page break — pricing rows and section blocks should not split mid-row or mid-block.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/quotes/[id]/print/page.tsx \
        src/app/portal/invoices/[id]/print/page.tsx \
        src/app/share/quote/[token]/page.tsx \
        src/app/share/invoice/[token]/page.tsx
git commit -m "feat(print): add break-inside avoid rules across print pages"
```

---

## Phase 3 — Share-page `?pdf=1` mode

### Task 3.1: `?pdf=1` on share quote page

**Files:**
- Modify: `src/app/share/quote/[token]/page.tsx`

- [ ] **Step 1: Read the `pdf` query param and gate side-effects + interactive panels**

The current page signature already accepts `searchParams: { print?: string }`. Extend it to also accept `pdf`:

```typescript
export default async function PublicQuotePage(
  { params, searchParams }: { params: { token: string }; searchParams: { print?: string; pdf?: string } },
) {
  const supabase = getServiceSupabase()
  const isPdfRender = searchParams?.pdf === '1'
  const autoPrint = searchParams?.print === '1' && !isPdfRender
  …
```

Then locate the existing block that promotes `sent → viewed` and writes to `audit_log`:

```typescript
if (quote.status === 'sent') {
  // … status update + audit insert …
}
```

Wrap the body so the side-effect is skipped when `isPdfRender` is true:

```typescript
if (quote.status === 'sent' && !isPdfRender) {
  // … existing status update + audit insert, unchanged …
}
```

Then locate the `<AcceptQuote>` mount near the bottom of the JSX and gate it:

```tsx
{!isPdfRender && (
  <AcceptQuote shareToken={params.token} status={quote.status} acceptedAt={quote.accepted_at} />
)}
```

The `<AutoPrint>` mount already uses `autoPrint` which now resolves to `false` whenever `isPdfRender` is true, so no separate gate is needed.

- [ ] **Step 2: Manual smoke**

1. Pick a quote currently in status `sent`. Note the `id` and `share_token`.
2. In a fresh incognito window (no staff session), open `/share/quote/{token}?pdf=1`.
3. Confirm: the AcceptQuote panel is NOT rendered. The print dialog does NOT auto-open.
4. Run a SQL check that the quote is still `status='sent'` and that no `audit_log` row was inserted for that quote in the last 60 seconds:

   ```sql
   select status from quotes where share_token = '...';
   select count(*) from audit_log
     where entity_table = 'quotes' and entity_id = '...' and created_at > now() - interval '1 minute';
   ```

   Expected: `status` still `sent`, count `0`.

- [ ] **Step 3: Commit**

```bash
git add src/app/share/quote/[token]/page.tsx
git commit -m "feat(share): add ?pdf=1 mode that suppresses status flip and AcceptQuote"
```

---

### Task 3.2: `?pdf=1` on share invoice page

**Files:**
- Modify: `src/app/share/invoice/[token]/page.tsx`

- [ ] **Step 1: Mirror the same pattern**

Extend `searchParams`:

```typescript
export default async function PublicInvoicePage(
  { params, searchParams }: { params: { token: string }; searchParams: { payment?: string; print?: string; pdf?: string } },
) {
  const supabase = getServiceSupabase()
  const isPdfRender = searchParams?.pdf === '1'
  const autoPrint = searchParams?.print === '1' && !isPdfRender
  …
```

Gate `<PayNowButton>`:

```tsx
{!isPdfRender && (
  <PayNowButton
    shareToken={params.token}
    status={invoice.status}
    datePaid={invoice.date_paid}
    paymentResult={searchParams.payment ?? null}
    total={fmt(total)}
  />
)}
```

The invoice share page has no status side-effect today (only the quote share page does), so no audit/status-flip gate is needed here.

- [ ] **Step 2: Manual smoke**

Open `/share/invoice/{token}?pdf=1` in incognito → confirm PayNowButton is hidden, no auto-print.

- [ ] **Step 3: Commit**

```bash
git add src/app/share/invoice/[token]/page.tsx
git commit -m "feat(share): add ?pdf=1 mode that suppresses PayNowButton on invoice share"
```

---

## Phase 4 — Staff PDF routes

### Task 4.1: `/api/quotes/[id]/pdf` route + tests

**Files:**
- Create: `src/app/api/quotes/[id]/pdf/route.ts`
- Create: `src/__tests__/api/quote-pdf.test.ts`

- [ ] **Step 1: Write the failing route tests**

`src/__tests__/api/quote-pdf.test.ts`:

```typescript
/** @jest-environment node */
import { GET as getStaffQuotePdf } from '@/app/api/quotes/[id]/pdf/route'

jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/pdf/render-pdf', () => ({
  renderPdfFromUrl: jest.fn(),
  parseCookieHeader: jest.fn(() => []),
  RenderPdfError: class RenderPdfError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as jest.Mock
const mockedRender = renderPdfFromUrl as jest.Mock

function makeSupabaseStub(overrides: {
  user?: { id: string; email: string } | null
  quote?: { quote_number: string; service_category: string | null; deleted_at: string | null } | null
} = {}) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: overrides.user ?? null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.quote ?? null, error: overrides.quote ? null : new Error('not found') }),
    }),
  }
}

function fakeRequest(): any {
  return {
    url: 'https://sano.nz/api/quotes/abc/pdf',
    headers: { get: () => '' },
  }
}

describe('GET /api/quotes/[id]/pdf', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedRender.mockReset()
  })

  it('returns 401 when no user', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({ user: null }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when quote is missing or soft-deleted', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({ user: { id: 'u', email: 'x@x' }, quote: null }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 with redirect message when quote is commercial', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({
      user: { id: 'u', email: 'x@x' },
      quote: { quote_number: 'QT-1', service_category: 'commercial', deleted_at: null },
    }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('/api/proposals/')
  })

  it('returns 200 with proper Content-Disposition on success', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({
      user: { id: 'u', email: 'x@x' },
      quote: { quote_number: 'QT-1234', service_category: 'residential', deleted_at: null },
    }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const cd = res.headers.get('content-disposition') ?? ''
    expect(cd).toContain('filename="Sano Quote - QT-1234.pdf"')
    expect(cd).toContain("filename*=UTF-8''Sano%20Quote%20-%20QT-1234.pdf")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern quote-pdf`
Expected: FAIL — module `@/app/api/quotes/[id]/pdf/route` not found.

- [ ] **Step 3: Implement the route**

`src/app/api/quotes/[id]/pdf/route.ts`:

```typescript
// Staff-only PDF for residential quotes.
// Commercial quotes use /api/proposals/[id]/pdf instead — this route
// returns 400 with a pointer if called with a commercial quote.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import {
  parseCookieHeader,
  renderPdfFromUrl,
  RenderPdfError,
} from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, service_category, deleted_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.service_category === 'commercial') {
    return NextResponse.json(
      { error: 'Commercial quotes use /api/proposals/[id]/pdf' },
      { status: 400 },
    )
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/portal/quotes/${params.id}/print`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.hostname)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    const stem = sanitizePdfFilename(`Sano Quote - ${quote.quote_number}`)
    const filename = `${stem}.pdf`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --testPathPattern quote-pdf`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Manual smoke**

1. `npm run dev`
2. Open a residential quote, navigate to `/api/quotes/{id}/pdf` directly in the browser (logged in as staff).
3. PDF downloads, named `Sano Quote - QT-xxxx.pdf`.
4. Open it. Layout matches the print page.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/quotes/[id]/pdf/route.ts src/__tests__/api/quote-pdf.test.ts
git commit -m "feat(quotes): add /api/quotes/[id]/pdf staff PDF route"
```

---

### Task 4.2: `/api/invoices/[id]/pdf` route + tests

**Files:**
- Create: `src/app/api/invoices/[id]/pdf/route.ts`
- Create: `src/__tests__/api/invoice-pdf.test.ts`

- [ ] **Step 1: Write the failing route tests**

`src/__tests__/api/invoice-pdf.test.ts` (mirrors the quote test, adjusted for invoices — no commercial guard):

```typescript
/** @jest-environment node */
import { GET as getStaffInvoicePdf } from '@/app/api/invoices/[id]/pdf/route'

jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/pdf/render-pdf', () => ({
  renderPdfFromUrl: jest.fn(),
  parseCookieHeader: jest.fn(() => []),
  RenderPdfError: class RenderPdfError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as jest.Mock
const mockedRender = renderPdfFromUrl as jest.Mock

function makeStub(overrides: {
  user?: { id: string; email: string } | null
  invoice?: { invoice_number: string; deleted_at: string | null } | null
} = {}) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: overrides.user ?? null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.invoice ?? null, error: overrides.invoice ? null : new Error('not found') }),
    }),
  }
}

function fakeRequest(): any {
  return { url: 'https://sano.nz/api/invoices/abc/pdf', headers: { get: () => '' } }
}

describe('GET /api/invoices/[id]/pdf', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedRender.mockReset()
  })

  it('returns 401 when no user', async () => {
    mockedCreate.mockReturnValue(makeStub({ user: null }))
    expect((await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })).status).toBe(401)
  })

  it('returns 404 when invoice missing', async () => {
    mockedCreate.mockReturnValue(makeStub({ user: { id: 'u', email: 'x@x' }, invoice: null }))
    expect((await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })).status).toBe(404)
  })

  it('returns 200 with Sano Tax Invoice filename on success', async () => {
    mockedCreate.mockReturnValue(makeStub({
      user: { id: 'u', email: 'x@x' },
      invoice: { invoice_number: 'INV-9001', deleted_at: null },
    }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(200)
    const cd = res.headers.get('content-disposition') ?? ''
    expect(cd).toContain('filename="Sano Tax Invoice - INV-9001.pdf"')
    expect(cd).toContain("filename*=UTF-8''Sano%20Tax%20Invoice%20-%20INV-9001.pdf")
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --testPathPattern invoice-pdf`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

`src/app/api/invoices/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import {
  parseCookieHeader,
  renderPdfFromUrl,
  RenderPdfError,
} from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, deleted_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const printUrl = `${url.origin}/portal/invoices/${params.id}/print`
  const cookies = parseCookieHeader(request.headers.get('cookie') ?? '', url.hostname)

  try {
    const buffer = await renderPdfFromUrl(printUrl, { cookies })
    const stem = sanitizePdfFilename(`Sano Tax Invoice - ${invoice.invoice_number}`)
    const filename = `${stem}.pdf`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --testPathPattern invoice-pdf`
Expected: PASS.

- [ ] **Step 5: Manual smoke**

`/api/invoices/{any-invoice-id}/pdf` downloads `Sano Tax Invoice - INV-xxxx.pdf` for staff.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/invoices/[id]/pdf/route.ts src/__tests__/api/invoice-pdf.test.ts
git commit -m "feat(invoices): add /api/invoices/[id]/pdf staff PDF route"
```

---

### Task 4.3: Wire "Download PDF" into QuoteActionBar (residential only)

**Files:**
- Create: `src/app/portal/quotes/[id]/_components/DownloadPdfButton.tsx`
- Modify: `src/app/portal/quotes/[id]/_components/QuoteActionBar.tsx`

- [ ] **Step 1: Create the button component**

`src/app/portal/quotes/[id]/_components/DownloadPdfButton.tsx`:

```typescript
import { Download } from 'lucide-react'

export function DownloadPdfButton({ href, label = 'Download PDF' }: { href: string; label?: string }) {
  // Server component — renders an <a> with `download` so the browser saves
  // the response from the PDF route directly. The route already sets
  // Content-Disposition: attachment, so this attribute is belt-and-braces.
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
    >
      <Download size={16} />
      {label}
    </a>
  )
}
```

- [ ] **Step 2: Wire it into QuoteActionBar (residential only)**

In `src/app/portal/quotes/[id]/_components/QuoteActionBar.tsx`:

1. Add to imports at the top:
   ```typescript
   import { DownloadPdfButton } from './DownloadPdfButton'
   ```
2. In both the `isDraft` and `isSent` branches, **after** the `<Link>` for the preview button and **only when `!isCommercial`**, insert:
   ```tsx
   {!isCommercial && (
     <DownloadPdfButton href={`/api/quotes/${quoteId}/pdf`} />
   )}
   ```
   (Commercial quotes already have a "Download PDF" button on the proposal preview page; we don't want to expose two competing buttons.)

- [ ] **Step 3: Manual smoke**

1. `/portal/quotes/{residential-quote-id}` — both Preview and Download PDF buttons visible.
2. `/portal/quotes/{commercial-quote-id}` — only the Preview Proposal button visible (no Download PDF added — proposal preview page handles it).
3. Click Download PDF → quote PDF downloads with correct filename.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/quotes/[id]/_components/DownloadPdfButton.tsx \
        src/app/portal/quotes/[id]/_components/QuoteActionBar.tsx
git commit -m "feat(quotes): expose Download PDF on residential quote action bar"
```

---

### Task 4.4: Wire "Download PDF" + rename Preview on invoice detail page

**Files:**
- Modify: `src/app/portal/invoices/[id]/page.tsx`

- [ ] **Step 1: Replace the existing Print/PDF link with two buttons**

Locate the `<a href={`/portal/invoices/${params.id}/print`} target="_blank" …>Print / PDF</a>` block (currently around line 175-184). Replace it with:

```tsx
<a
  href={`/portal/invoices/${params.id}/print`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
>
  <Printer size={16} />
  Preview Invoice
</a>
<a
  href={`/api/invoices/${params.id}/pdf`}
  download
  className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
>
  <Download size={16} />
  Download PDF
</a>
```

Add `Download` to the existing `lucide-react` import at the top of the file.

- [ ] **Step 2: Manual smoke**

`/portal/invoices/{id}` shows both Preview Invoice and Download PDF; the latter downloads the file.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/invoices/[id]/page.tsx
git commit -m "feat(invoices): split Print/PDF into Preview Invoice + Download PDF"
```

---

## Phase 5 — Public share PDF routes

### Task 5.1: `/api/share/quote/[token]/pdf` route + tests

**Files:**
- Create: `src/app/api/share/quote/[token]/pdf/route.ts`
- Modify: `src/__tests__/api/quote-pdf.test.ts` (add a `describe` block for the share variant)

- [ ] **Step 1: Add failing tests for the share variant**

Append to `src/__tests__/api/quote-pdf.test.ts`:

```typescript
import { GET as getShareQuotePdf } from '@/app/api/share/quote/[token]/pdf/route'

jest.mock('@/lib/supabase-service', () => ({
  getServiceSupabase: jest.fn(),
}))
import { getServiceSupabase } from '@/lib/supabase-service'
const mockedService = getServiceSupabase as jest.Mock

function shareStub(overrides: { quote?: { quote_number: string; deleted_at: string | null } | null } = {}) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.quote ?? null, error: overrides.quote ? null : new Error('not found') }),
    }),
  }
}

function shareRequest(): any {
  return { url: 'https://sano.nz/api/share/quote/tok123/pdf', headers: { get: () => '' } }
}

describe('GET /api/share/quote/[token]/pdf', () => {
  beforeEach(() => {
    mockedService.mockReset()
    mockedRender.mockReset()
  })

  it('returns 404 when token does not match (or record soft-deleted)', async () => {
    mockedService.mockReturnValue(shareStub({ quote: null }))
    const res = await getShareQuotePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(404)
  })

  it('returns 200 with Sano Quote filename on success', async () => {
    mockedService.mockReturnValue(shareStub({ quote: { quote_number: 'QT-7', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getShareQuotePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition') ?? '').toContain('filename="Sano Quote - QT-7.pdf"')
  })

  it('does NOT forward cookies to the renderer (public flow)', async () => {
    mockedService.mockReturnValue(shareStub({ quote: { quote_number: 'QT-7', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    await getShareQuotePdf(shareRequest(), { params: { token: 'tok123' } })
    const lastCall = mockedRender.mock.calls.at(-1)
    expect(lastCall?.[1]?.cookies ?? []).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --testPathPattern quote-pdf`
Expected: FAIL on the new share-route describe block — module not found.

- [ ] **Step 3: Implement the route**

`src/app/api/share/quote/[token]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = getServiceSupabase()
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, deleted_at')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(request.url)
  const printUrl = `${url.origin}/share/quote/${params.token}?pdf=1`

  try {
    const buffer = await renderPdfFromUrl(printUrl, {})
    const stem = sanitizePdfFilename(`Sano Quote - ${quote.quote_number}`)
    const filename = `${stem}.pdf`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --testPathPattern quote-pdf`
Expected: PASS — staff + share blocks all green.

- [ ] **Step 5: Manual smoke (in incognito, no staff session)**

1. Open `/api/share/quote/{token}/pdf`. PDF downloads, named `Sano Quote - QT-xxxx.pdf`.
2. The downloaded PDF must NOT show the AcceptQuote panel, and the source quote's `status` must NOT have changed from `sent` to `viewed`. Re-run the SQL check from Task 3.1 Step 2.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/share/quote/[token]/pdf/route.ts src/__tests__/api/quote-pdf.test.ts
git commit -m "feat(share): add /api/share/quote/[token]/pdf public PDF route"
```

---

### Task 5.2: `/api/share/invoice/[token]/pdf` route + tests

**Files:**
- Create: `src/app/api/share/invoice/[token]/pdf/route.ts`
- Modify: `src/__tests__/api/invoice-pdf.test.ts` (add a `describe` block)

- [ ] **Step 1: Add failing tests**

Append to `src/__tests__/api/invoice-pdf.test.ts`:

```typescript
import { GET as getShareInvoicePdf } from '@/app/api/share/invoice/[token]/pdf/route'

jest.mock('@/lib/supabase-service', () => ({
  getServiceSupabase: jest.fn(),
}))
import { getServiceSupabase } from '@/lib/supabase-service'
const mockedService = getServiceSupabase as jest.Mock

function shareStub(overrides: { invoice?: { invoice_number: string; deleted_at: string | null } | null } = {}) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.invoice ?? null, error: overrides.invoice ? null : new Error('not found') }),
    }),
  }
}

function shareRequest(): any {
  return { url: 'https://sano.nz/api/share/invoice/tok123/pdf', headers: { get: () => '' } }
}

describe('GET /api/share/invoice/[token]/pdf', () => {
  beforeEach(() => {
    mockedService.mockReset()
    mockedRender.mockReset()
  })

  it('returns 404 when token unknown', async () => {
    mockedService.mockReturnValue(shareStub({ invoice: null }))
    expect((await getShareInvoicePdf(shareRequest(), { params: { token: 'tok123' } })).status).toBe(404)
  })

  it('returns 200 with Sano Tax Invoice filename', async () => {
    mockedService.mockReturnValue(shareStub({ invoice: { invoice_number: 'INV-12', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getShareInvoicePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition') ?? '').toContain('filename="Sano Tax Invoice - INV-12.pdf"')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --testPathPattern invoice-pdf`
Expected: FAIL on share-route block.

- [ ] **Step 3: Implement the route**

`src/app/api/share/invoice/[token]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { renderPdfFromUrl, RenderPdfError } from '@/lib/pdf/render-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = getServiceSupabase()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, deleted_at')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(request.url)
  const printUrl = `${url.origin}/share/invoice/${params.token}?pdf=1`

  try {
    const buffer = await renderPdfFromUrl(printUrl, {})
    const stem = sanitizePdfFilename(`Sano Tax Invoice - ${invoice.invoice_number}`)
    const filename = `${stem}.pdf`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          `attachment; filename="${filename}"; ` +
          `filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof RenderPdfError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --testPathPattern invoice-pdf`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/share/invoice/[token]/pdf/route.ts src/__tests__/api/invoice-pdf.test.ts
git commit -m "feat(share): add /api/share/invoice/[token]/pdf public PDF route"
```

---

### Task 5.3: Add Download PDF button to share quote page

**Files:**
- Create: `src/app/share/_components/SharePdfButton.tsx`
- Modify: `src/app/share/quote/[token]/page.tsx`

- [ ] **Step 1: Create the share-side button**

`src/app/share/_components/SharePdfButton.tsx`:

```typescript
import { Download } from 'lucide-react'

export function SharePdfButton({ href, label = 'Download PDF' }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sage-700 text-white font-semibold text-sm shadow-sm hover:bg-sage-800 transition-colors"
    >
      <Download size={16} />
      {label}
    </a>
  )
}
```

(Visually distinct from the staff button: filled solid sage rather than outlined, because on the share page it's the primary call-to-action alongside Accept.)

- [ ] **Step 2: Mount on the share quote page**

In `src/app/share/quote/[token]/page.tsx`:

1. Add to imports: `import { SharePdfButton } from '../../_components/SharePdfButton'`
2. Inside the JSX, just **above** the `<AcceptQuote>` mount (and outside the `!isPdfRender` gate so it appears in normal customer view but never inside a PDF render of itself), add:

   ```tsx
   {!isPdfRender && (
     <div className="mt-6 flex justify-end">
       <SharePdfButton href={`/api/share/quote/${params.token}/pdf`} />
     </div>
   )}
   ```

- [ ] **Step 3: Manual smoke**

In incognito, open `/share/quote/{token}`. A "Download PDF" button is visible above the Accept panel. Click it → file downloads with correct name.

- [ ] **Step 4: Commit**

```bash
git add src/app/share/_components/SharePdfButton.tsx src/app/share/quote/[token]/page.tsx
git commit -m "feat(share): expose Download PDF on quote share page"
```

---

### Task 5.4: Add Download PDF button to share invoice page

**Files:**
- Modify: `src/app/share/invoice/[token]/page.tsx`

- [ ] **Step 1: Mount the button**

1. Add to imports: `import { SharePdfButton } from '../../_components/SharePdfButton'`
2. Just **above** the `<PayNowButton>` mount (and gated on `!isPdfRender`):

   ```tsx
   {!isPdfRender && (
     <div className="mt-6 flex justify-end">
       <SharePdfButton href={`/api/share/invoice/${params.token}/pdf`} />
     </div>
   )}
   ```

- [ ] **Step 2: Manual smoke**

Open `/share/invoice/{token}` in incognito. Download PDF button visible above PayNow; click downloads the file.

- [ ] **Step 3: Commit**

```bash
git add src/app/share/invoice/[token]/page.tsx
git commit -m "feat(share): expose Download PDF on invoice share page"
```

---

## HARD STOP HS-2 — End-to-end verification before email auto-attach

Before starting Phase 6, verify all four routes work on real data. This is a manual checklist; do not skip it.

- [ ] Staff: `/portal/quotes/{residential-id}` → click Download PDF → file is `Sano Quote - QT-xxxx.pdf`, opens, layout is correct.
- [ ] Staff: `/portal/invoices/{id}` → click Download PDF → file is `Sano Tax Invoice - INV-xxxx.pdf`, opens, layout is correct.
- [ ] Staff: `/portal/quotes/{commercial-id}` → no Download PDF button visible (commercial uses proposal route which is unchanged).
- [ ] Public: `/share/quote/{token}` in incognito → Download PDF button visible, file downloads with correct name, AcceptQuote NOT in the PDF, source quote `status` did NOT flip from `sent` → `viewed`, no `audit_log` row inserted.
- [ ] Public: `/share/invoice/{token}` in incognito → Download PDF button visible, file downloads, PayNowButton NOT in the PDF.
- [ ] All tests passing: `npm test`.

If any of these fail, fix before proceeding to Phase 6. Email auto-attach amplifies bugs in the renderer — every send becomes a customer-visible failure.

---

## Phase 6 — Email auto-attach (fail-fast)

### Task 6.1: Update `sendQuoteEmail` to attach the share PDF

**Files:**
- Modify: `src/app/portal/quotes/[id]/_actions.ts`

- [ ] **Step 1: Render the PDF before sending**

In `src/app/portal/quotes/[id]/_actions.ts`, locate `export async function sendQuoteEmail(input: SendQuoteInput)`.

1. Add to the imports at the top of the file:
   ```typescript
   import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
   import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
   import { headers } from 'next/headers'
   ```

2. After the `if (quote.sent_at) { … }` dedupe block and before the existing `const resend = new Resend(...)` line, insert:

   ```typescript
   // Phase J — render the share-page PDF and attach it. Fail-fast:
   // if rendering fails, do NOT send the email and do NOT flip status.
   const origin =
     process.env.NEXT_PUBLIC_SITE_URL ??
     `https://${headers().get('host') ?? 'sano.nz'}`

   // Reload the quote to get share_token and quote_number — the earlier
   // narrow select didn't fetch them.
   const { data: full } = await supabase
     .from('quotes')
     .select('share_token, quote_number')
     .eq('id', input.quote_id)
     .single()

   if (!full?.share_token || !full?.quote_number) {
     return { error: 'PDF generation failed, so the email was not sent. Please try again.' }
   }

   let pdfBuffer: Buffer
   try {
     pdfBuffer = await renderPdfFromUrl(
       `${origin}/share/quote/${full.share_token}?pdf=1`,
       {},
     )
   } catch (err) {
     const detail = err instanceof Error ? err.message : 'unknown error'
     return {
       error: 'PDF generation failed, so the email was not sent. Please try again.',
       detail,
     }
   }

   const pdfFilename = `${sanitizePdfFilename(`Sano Quote - ${full.quote_number}`)}.pdf`
   ```

3. Replace the existing `resend.emails.send({...})` call with a version that adds `attachments`:

   ```typescript
   const { error: emailErr } = await resend.emails.send({
     from: 'Sano <noreply@sano.nz>',
     to: input.to.trim(),
     ...(ccList.length > 0 ? { cc: ccList } : {}),
     subject: input.subject,
     html,
     attachments: [{ filename: pdfFilename, content: pdfBuffer }],
   })
   ```

The existing post-send status flip and `revalidatePath` calls are unchanged. The `Failed to send email: ...` early-return on `emailErr` already prevents status flip on Resend failure.

- [ ] **Step 2: Manual smoke**

1. `npm run dev` (with `PUPPETEER_EXECUTABLE_PATH` set in `.env.local`).
2. Open a residential quote, click Send Quote, send to your own email.
3. Confirm: the email arrives with a `Sano Quote - QT-xxxx.pdf` attachment that opens correctly.
4. Confirm in DB: the quote's `status` flipped to `sent` and `sent_at` is recent.
5. **Failure path test:** temporarily unset `PUPPETEER_EXECUTABLE_PATH` (Windows/macOS local dev). Re-attempt send. Confirm: error returned by the action contains the user-visible string `"PDF generation failed, so the email was not sent. Please try again."` and the quote `status` is unchanged. Restore the env var.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/quotes/[id]/_actions.ts
git commit -m "feat(quotes): auto-attach Sano Quote PDF to send email (fail-fast)"
```

---

### Task 6.2: Update `sendInvoiceEmail` to attach the share PDF

**Files:**
- Modify: `src/app/portal/invoices/[id]/_actions.ts`

- [ ] **Step 1: Mirror the quote pattern**

In `src/app/portal/invoices/[id]/_actions.ts`, locate `export async function sendInvoiceEmail(input: SendInvoiceInput)`.

1. Add imports:
   ```typescript
   import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
   import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
   import { headers } from 'next/headers'
   ```

2. Just before the existing `const resend = new Resend(...)` line, insert:

   ```typescript
   const origin =
     process.env.NEXT_PUBLIC_SITE_URL ??
     `https://${headers().get('host') ?? 'sano.nz'}`

   const supabase = createClient()
   const { data: invoiceRow } = await supabase
     .from('invoices')
     .select('share_token, invoice_number')
     .eq('id', input.invoice_id)
     .single()

   if (!invoiceRow?.share_token || !invoiceRow?.invoice_number) {
     return { error: 'PDF generation failed, so the email was not sent. Please try again.' }
   }

   let pdfBuffer: Buffer
   try {
     pdfBuffer = await renderPdfFromUrl(
       `${origin}/share/invoice/${invoiceRow.share_token}?pdf=1`,
       {},
     )
   } catch (err) {
     const detail = err instanceof Error ? err.message : 'unknown error'
     return {
       error: 'PDF generation failed, so the email was not sent. Please try again.',
       detail,
     }
   }

   const pdfFilename = `${sanitizePdfFilename(`Sano Tax Invoice - ${invoiceRow.invoice_number}`)}.pdf`
   ```

3. Replace the existing `resend.emails.send({...})` call with the attachment-bearing version:

   ```typescript
   const { error: emailErr } = await resend.emails.send({
     from: 'Sano <noreply@sano.nz>',
     to: input.to.trim(),
     ...(ccList.length > 0 ? { cc: ccList } : {}),
     subject: input.subject,
     html,
     attachments: [{ filename: pdfFilename, content: pdfBuffer }],
   })
   ```

4. The existing block that re-creates `const supabase = createClient()` later in the function (used for the `from('invoices').select('date_issued')` post-send update) is now redundant — remove it and let the same `supabase` variable from above flow through. Confirm by reading the diff: there should be exactly one `const supabase = createClient()` in the function after this change.

- [ ] **Step 2: Manual smoke**

Same as 6.1 but for invoices. Confirm filename `Sano Tax Invoice - INV-xxxx.pdf`, status flips, fail-path returns the user-visible string.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/invoices/[id]/_actions.ts
git commit -m "feat(invoices): auto-attach Sano Tax Invoice PDF to send email (fail-fast)"
```

---

### Task 6.3: Verify the error string surfaces in the Send panels

**Files:**
- Read-only: `src/app/portal/quotes/[id]/_components/SendQuotePanel.tsx`
- Read-only: `src/app/portal/invoices/[id]/_components/SendInvoicePanel.tsx`

- [ ] **Step 1: Confirm both panels pass `result.error` straight through**

`SendQuotePanel.tsx` already does `setError(result.error)` (around line 73 — read it to verify). `SendInvoicePanel.tsx` should do the same. Run:

```
grep -n "setError(result\.error)" src/app/portal/invoices/[id]/_components/SendInvoicePanel.tsx
```

Expected: at least one match. If zero matches, the invoice panel is rewriting or swallowing the error — fix it to mirror the quote panel exactly: `if (result?.error) { setError(result.error) }`.

- [ ] **Step 2: Confirm the loading state already exists**

Both panels use `useTransition`. Send a test quote in dev — the Send button should disable while in-flight (~10-30s with the PDF render). If the button doesn't visually indicate a pending state, add `disabled={isPending}` and `{isPending ? 'Sending…' : 'Send Quote'}` to the button using the existing `useTransition` `isPending` flag. Same for invoices.

- [ ] **Step 3: Commit (skip if no changes were necessary)**

```bash
git add -A
git commit -m "fix(send): surface PDF-generation error string in send panels"
```

---

### Task 6.4: Unit test the fail-fast send path

**Files:**
- Create: `src/__tests__/actions/send-quote-email.test.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/actions/send-quote-email.test.ts`:

```typescript
/** @jest-environment node */

// Verify the fail-fast contract: when the PDF render throws, the
// action returns the user-visible error string AND does NOT call
// Resend AND does NOT update quote status.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/pdf/render-pdf')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({
  headers: () => ({ get: () => 'sano.nz' }),
}))

const mockResendSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}))

import { sendQuoteEmail } from '@/app/portal/quotes/[id]/_actions'
import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as unknown as jest.Mock
const mockedRender = renderPdfFromUrl as unknown as jest.Mock

function makeQuoteSelect(row: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: row, error: row ? null : new Error('not found') }),
    update: jest.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  mockedCreate.mockReset()
  mockedRender.mockReset()
  mockResendSend.mockReset()
})

describe('sendQuoteEmail — fail-fast PDF render', () => {
  it('returns the user-visible error string and does NOT call Resend or update status', async () => {
    // First .from('quotes') call: dedupe check (returns a quote with no recent sent_at)
    // Second .from('quotes') call: fetch share_token + quote_number for PDF
    let call = 0
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) return makeQuoteSelect({ date_issued: null, valid_until: null, sent_at: null })
      return makeQuoteSelect({ share_token: 'tok-x', quote_number: 'QT-99' })
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockRejectedValue(new Error('puppeteer launch failed'))

    const result = await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    expect(result).toMatchObject({
      error: 'PDF generation failed, so the email was not sent. Please try again.',
    })
    expect(mockResendSend).not.toHaveBeenCalled()

    // Verify no .update() was invoked on quotes.
    const allCalls = fromMock.mock.results.flatMap((r) => r.value.update?.mock?.calls ?? [])
    expect(allCalls).toEqual([])
  })

  it('attaches the PDF buffer with the correct filename when render succeeds', async () => {
    let call = 0
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) return makeQuoteSelect({ date_issued: null, valid_until: null, sent_at: null })
      if (call === 2) return makeQuoteSelect({ share_token: 'tok-x', quote_number: 'QT-99' })
      return { update: updateMock }
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF-CONTENT'))
    mockResendSend.mockResolvedValue({ error: null })

    const result = await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    expect(result).toEqual({ success: true })
    const sendArgs = mockResendSend.mock.calls[0][0]
    expect(sendArgs.attachments).toEqual([
      { filename: 'Sano Quote - QT-99.pdf', content: Buffer.from('PDF-CONTENT') },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern send-quote-email`
Expected: FAIL — at least the assertions about `attachments` and the user-visible error string fail until Task 6.1's wiring is in place. (If Task 6.1 has already shipped, the test should pass; if 6.4 was somehow run first, it correctly demonstrates the missing wiring.)

- [ ] **Step 3: Run again after Task 6.1 is in place to verify pass**

Run: `npm test -- --testPathPattern send-quote-email`
Expected: PASS — both tests green.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/actions/send-quote-email.test.ts
git commit -m "test(quotes): cover fail-fast PDF-render path in sendQuoteEmail"
```

(`sendInvoiceEmail` is structurally identical — covered by manual smoke in Task 6.2 Step 2 rather than a duplicate unit-test setup.)

---

## Phase 7 — Documentation

### Task 7.1: Update PORTAL.md

**Files:**
- Modify: `docs/PORTAL.md`

- [ ] **Step 1: Add a "Phase J — Quote & Invoice PDF" section under "Current system status"**

In `docs/PORTAL.md`, locate the "Current system status" block (around line 47). Find the closing fence of the last shipped sub-section (currently Notifications / Phase H), and add this new sub-section in the same style:

```markdown
### Quote & Invoice PDF (Phase J)

- Server-rendered PDF download for residential quotes and invoices via
  Puppeteer (`puppeteer-core` + `@sparticuz/chromium`), reusing the
  proposal-PDF pattern. Routes:
  - `GET /api/quotes/[id]/pdf` (staff, residential only — commercial
    returns 400 pointing at `/api/proposals/[id]/pdf`).
  - `GET /api/invoices/[id]/pdf` (staff).
  - `GET /api/share/quote/[token]/pdf` (public, by share token).
  - `GET /api/share/invoice/[token]/pdf` (public).
- Shared `src/lib/pdf/render-pdf.ts` helper hosts the Puppeteer
  boot-navigate-capture plumbing; the existing proposal route refactored
  to use it.
- Filenames: `Sano Quote - QT-xxxx.pdf` and `Sano Tax Invoice - INV-xxxx.pdf`,
  emitted with both `filename` and RFC-5987 `filename*` forms.
- New `?pdf=1` mode on the share pages: hides `<AcceptQuote>` /
  `<PayNowButton>`, suppresses `<AutoPrint>`, and short-circuits the
  `sent → viewed` status promotion + audit row on quote share renders.
- Send Quote / Send Invoice emails now auto-attach the share-page PDF
  with fail-fast semantics — if Puppeteer fails, the email is not sent
  and the status does not flip.
- Print-page metadata switched to async `generateMetadata` so the
  browser tab title and Ctrl+P-saved filename match the same convention.
- Print stylesheets gained `break-inside: avoid` rules to prevent
  awkward page splits in long quotes.
```

- [ ] **Step 2: Update the "Current Active Work" pointer at the top**

If the current focus pointer (around line 11) still references Phase 5.1 applicant work and that work has shipped in the meantime, leave it — only the team owner should rewrite that pointer. Otherwise add a one-line "Recently shipped: Phase J — Quote & Invoice PDF (2026-05-06)" near the active focus block.

- [ ] **Step 3: Commit**

```bash
git add docs/PORTAL.md
git commit -m "docs(portal): record Phase J — Quote & Invoice PDF"
```

---

## Final verification

- [ ] Run the full test suite: `npm test`
  Expected: all green, no skipped suites.
- [ ] Run the type checker: `npm run typecheck` (or `tsc --noEmit` if no script).
- [ ] Run lint: `npm run lint`.
- [ ] Manual end-to-end across all six surfaces (quote staff, invoice staff, quote share, invoice share, send-quote email, send-invoice email).
- [ ] Confirm zero changes in the proposal-PDF output (visual diff against a pre-Phase-1 download).
