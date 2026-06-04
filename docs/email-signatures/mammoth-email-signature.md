# Mammoth Email Signature — Mike Browne

Reference notes for the Mammoth Modern Insulation email signature
hosted on the Sano site.

The live signature is at: **`/email-signature-mammoth`**
(production: <https://sano.nz/email-signature-mammoth>).
That route is the install path — open it in a browser, select-all, copy,
paste into Outlook. The signature markup is rendered inline; no separate
HTML file needs editing.

## Current design (v2 — live Take-Back strip)

One 720 px-wide table with two rows:

1. **Banner image** (`mammoth-signature-banner.png`, 720 × 286) wrapped
   in a link to <https://mammoth.co.nz>. Logo, 25-year ribbon, contact
   details, accreditation badges.
2. **Live HTML Take-Back strip** — grey bar (`#46413B`) with white text
   *"Recycling your offcuts? Mammoth takes them back, free."* and a red
   *"Learn more ›"* button (`#EE2D24`) linking to
   <https://www.mammoth.co.nz/pages/recycle>.

The Take-Back strip is **live HTML, not an image** — it always renders
in Outlook / Gmail / Apple Mail even when remote images are blocked.
Square button corners in classic Outlook are expected (it ignores
`border-radius`).

The whole signature is table-based with inline styles and the Arial
font stack so it renders consistently across Outlook desktop, Gmail,
and Apple Mail.

## Hosted image assets

Served under `public/email/` → `https://sano.nz/email/`:

| File | Dimensions | Status | Purpose |
|---|---|---|---|
| `mammoth-signature-banner.png` | 720 × 286 | **active (v2)** | Single banner image used by the current signature. Links to <https://mammoth.co.nz>. |
| `mammoth-signature-top.png` | 904 × 292 | retained | v1 banner. Kept hosted so older installed signatures continue to load. |
| `mammoth-signature-cta.png` | 904 × 57  | retained | v1 Take-Back CTA bar (image-based). Kept hosted for the same reason. |
| `mammoth-signature-full.png` | 904 × 349 | retained | v1 one-image fallback. Kept hosted for the same reason. |

The v1 assets stay live so any Outlook clients still running an older
copy of the signature don't suddenly show broken images. They can be
retired in a separate cleanup once everyone is on v2.

## Install in Outlook (desktop)

1. Open <https://sano.nz/email-signature-mammoth> in a browser.
2. Select all (Ctrl+A) and copy (Ctrl+C). Start the selection at
   *"Kind regards,"* so the prefix is included.
3. Outlook → File → Options → Mail → Signatures → New.
4. Paste (Ctrl+V) into the edit box. Save.

Alternative: copy `signature.html` (regenerate via the Claude design
package — not stored in the repo) into
`%USERPROFILE%\AppData\Roaming\Microsoft\Signatures` as `Mammoth.htm`,
restart Outlook, and pick it under Signatures.

For Gmail / Apple Mail: same open-and-copy approach as Outlook —
Gmail Settings → See all settings → General → Signature; Apple Mail
Settings → Signatures.

## Notes

- The only outbound links from the signature are <https://mammoth.co.nz>
  and <https://www.mammoth.co.nz/pages/recycle>. Nothing references or
  links back to where the banner image is hosted; no tracking pixels.
- The signature is 720 px wide and scales down on narrow screens via
  `max-width: 100%`.
- The Take-Back strip is **live HTML** so it always renders, even when
  Outlook blocks remote images. This was the main reason for the v2
  redesign — v1's image-based CTA bar would drop out under image blocks.
- Need crisper / retina (2×) images, a narrower width, or any text
  change? The signature was generated through Claude design — request a
  regenerated package, drop the new banner PNG into `public/email/`,
  and redeploy.

## Repo touchpoints

- Preview route: `src/app/email-signature-mammoth/page.tsx`
- Active asset: `public/email/mammoth-signature-banner.png`
- Retained v1 assets: `public/email/mammoth-signature-{top,cta,full}.png`
