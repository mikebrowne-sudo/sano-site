# Mammoth Email Signature — Mike Browne

Reference notes for the Mammoth Modern Insulation email signature
hosted on the Sano site.

The live signature is at: **`/email-signature-mammoth`**
(production: <https://sano.nz/email-signature-mammoth>).
That route is the install path — open it in a browser, select-all, copy,
paste into Outlook. The signature markup is rendered inline; no separate
HTML file needs editing.

## Hosted image assets

Served under `public/email/` → `https://sano.nz/email/`:

| File | Dimensions | Purpose |
|---|---|---|
| `mammoth-signature-top.png` | 904 × 292 | Banner image (logo, ribbon, contact details, badges). Links to <https://mammoth.co.nz>. |
| `mammoth-signature-cta.png` | 904 × 57  | Take-Back CTA bar. Links to <https://www.mammoth.co.nz/pages/recycle>. |
| `mammoth-signature-full.png` | 904 × 349 | One-image fallback. Use only if a single-link version is wanted. |

## Why two images (not one)

A single flat image can only carry one link. To get two separate links
(website + Take Back Programme) the signature is built as two stacked
images. This keeps the exact look and works reliably in Outlook desktop,
where gradients and rounded corners in live HTML don't render.

## Install in Outlook (desktop)

1. Open <https://sano.nz/email-signature-mammoth> in a browser.
2. Select all (Ctrl+A) and copy (Ctrl+C).
3. Outlook → File → Options → Mail → Signatures → New.
4. Paste (Ctrl+V) into the edit box. Save.

Alternative: place the `.htm` file (and a matching `_files` folder if
your tool makes one) into
`%USERPROFILE%\AppData\Roaming\Microsoft\Signatures`.

## Notes

- The only outbound links from the signature are `mammoth.co.nz` and
  `mammoth.co.nz/pages/recycle`. Nothing references or links back to
  the Sano-hosted images.
- Images are 904 px wide (matches the Sano banner). They scale down on
  narrow screens via `max-width: 100%`.
- Need crisper / retina (2×) images, a narrower width, or any text
  change? The signature was generated through Claude design — request a
  regenerated package, drop the new PNGs into `public/email/`, and
  redeploy.

## Repo touchpoints

- Preview route: `src/app/email-signature-mammoth/page.tsx`
- Hosted assets: `public/email/mammoth-signature-*.png`
