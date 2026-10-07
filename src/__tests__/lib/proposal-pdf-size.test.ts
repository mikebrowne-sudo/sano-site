/**
 * Guard against the CSS-filter PDF bloat.
 *
 * `filter: brightness(0.55)` on the proposal header background forced Chromium
 * to rasterize that element into its own composited layer. The source JPEG was
 * discarded and a LOSSLESS PNG of the filtered result embedded instead - once
 * per page, since each page's raster is a distinct pixel buffer.
 *
 * Measured on a faithful reproduction of the real 9-page geometry:
 *
 *   with filter: brightness()   11.116 MB   (18 x FlateDecode 2481x334)
 *   with rgba overlay            2.309 MB   (JPEG passthrough, shared)
 *
 * That is ~10.6 MB of an 11 MB document, enough to be rejected by mail
 * gateways that cap at 10 MB - and a tender bouncing silently is the worst
 * failure mode there is.
 *
 * Unfiltered images pass through as DCTDecode and are de-duplicated across
 * pages, so any CSS filter on a repeated image element reintroduces this.
 */

import { PROPOSAL_CSS } from '@/components/proposals/proposal-styles'

/** CSS declarations only - comments explaining the rule are not declarations. */
function declarations(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('proposal PDF size - no rasterising CSS filters', () => {
  it('declares no CSS filter anywhere in the proposal stylesheet', () => {
    expect(declarations(PROPOSAL_CSS)).not.toMatch(/(^|[;{\s])filter\s*:/)
  })

  it('does not reintroduce brightness() on the header background', () => {
    expect(declarations(PROPOSAL_CSS)).not.toMatch(/brightness\s*\(/)
  })

  it('still darkens the header, via the overlay', () => {
    // The darkening is a requirement - white text sits on this banner. It just
    // has to be done with compositing rather than a filter.
    const css = declarations(PROPOSAL_CSS)
    const overlay = css.slice(css.indexOf('.proposal-header__overlay'))
    expect(overlay).toMatch(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.45\s*\)/)
  })

  it('keeps the directional gradient over the flat darkening', () => {
    const css = declarations(PROPOSAL_CSS)
    const overlay = css.slice(css.indexOf('.proposal-header__overlay'))
    expect(overlay).toMatch(/linear-gradient/)
  })
})
