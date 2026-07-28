'use client'

// Anchors the closing block (totals → terms → footer) to the bottom of the
// FINAL printed page. Pure layout: it only sets the height of the existing
// `.doc-endspacer` element that sits immediately before `.doc-totals-wrap`.
// It never touches wording, amounts, data, or the pagination of the content
// above it.
//
// Why a script and not CSS: on a multi-page document there is no CSS length
// equal to "the height remaining on the LAST page". `min-height: 100vh` is one
// page tall, so once content exceeds a page it adds no slack and the totals
// float mid-page. Here we measure the real page height (a 297 mm probe, which
// is deterministic in print), work out how much of the last page is unused,
// and expand the spacer to push the closing block down to the bottom — with a
// safety margin so it can never spill onto a new page.
//
// Runs for print output only:
//   • Puppeteer PDF: the renderer sets media = print before load, so
//     `matchMedia('print')` is true on mount and we fill once immediately.
//   • Browser print preview / Ctrl-P: we (re)compute on `beforeprint` and
//     reset on `afterprint`, so the on-screen view is never affected.

import { useEffect } from 'react'

function measurePageHeight(): number {
  // One physical page height. A 297 mm probe converts mm→px with the print
  // engine's own DPI — unlike `vh`, which equals one page and so gives no
  // last-page slack on a multi-page document (the reason a pure-CSS
  // min-height/flex anchor cannot reach the bottom of the final page).
  const probe = document.createElement('div')
  probe.style.cssText = 'height:297mm;position:absolute;visibility:hidden;top:0;left:0;pointer-events:none;'
  document.body.appendChild(probe)
  const h = probe.getBoundingClientRect().height
  probe.remove()
  return h
}

function applyFill() {
  if (typeof window === 'undefined') return
  const doc = document.querySelector('.doc') as HTMLElement | null
  const spacer = document.querySelector('.doc-endspacer') as HTMLElement | null
  const closingStart = document.querySelector('.doc-totals-wrap') as HTMLElement | null
  const footer = document.querySelector('.doc-footer') as HTMLElement | null
  if (!doc || !spacer || !closingStart || !footer) return

  // Always measure from a clean slate.
  spacer.style.height = '0px'

  const pageH = measurePageHeight()
  if (!pageH || pageH < 200) return

  // The closing block = totals-wrap top → footer bottom. If it alone is taller
  // than a page, leave it to paginate normally — never try to anchor it.
  const docTop = doc.getBoundingClientRect().top
  const closingH = footer.getBoundingClientRect().bottom - (closingStart.getBoundingClientRect().top - docTop) - docTop
  if (closingH >= pageH) return

  // The document's natural (unfilled) page count. We grow the spacer only as
  // far as we can WITHOUT pushing the document onto one more physical page —
  // this is what anchors the closing block to the bottom of its current last
  // page. Using the real paginated page count (ceil of the measured document
  // height) as the guard makes this immune to the difference between the
  // continuous box positions we can read from JS and where Chromium actually
  // breaks pages (break-inside:avoid on items shifts content between them).
  const naturalPages = Math.ceil(doc.getBoundingClientRect().height / pageH)

  // Binary-search the largest spacer height that keeps the page count at
  // naturalPages. At the maximum, the closing block sits flush at the bottom
  // of the final page. If there's no slack (content already fills the page),
  // best stays 0 and nothing moves.
  let lo = 0
  let hi = pageH
  let best = 0
  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((lo + hi) / 2)
    if (mid <= best) break
    spacer.style.height = `${mid}px`
    const pages = Math.ceil((doc.getBoundingClientRect().height - 1) / pageH)
    if (pages > naturalPages) {
      hi = mid - 1 // overshoot — would add a page; back off
    } else {
      best = mid
      lo = mid + 1
    }
  }
  spacer.style.height = `${best}px`
}

function clearFill() {
  const spacer = document.querySelector('.doc-endspacer') as HTMLElement | null
  if (spacer) spacer.style.height = '0px'
}

export function LastPageFill() {
  useEffect(() => {
    // Puppeteer renders with media=print, so fill immediately on mount. In a
    // normal on-screen browser matchMedia('print') is false, so this no-ops
    // and the screen view is untouched.
    let printMedia = false
    try {
      printMedia = window.matchMedia && window.matchMedia('print').matches
    } catch {
      printMedia = false
    }
    if (printMedia) {
      // Run after fonts settle so heights are final (fonts shift line counts).
      const run = () => applyFill()
      run()
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
      if (fonts?.ready) {
        fonts.ready.then(run).catch(() => {})
      }
      // A short retry covers any late layout settle under networkidle capture.
      const t = window.setTimeout(run, 150)
      return () => window.clearTimeout(t)
    }

    // Browser print preview / Ctrl-P: compute just before printing, reset after.
    const before = () => applyFill()
    const after = () => clearFill()
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  return null
}
