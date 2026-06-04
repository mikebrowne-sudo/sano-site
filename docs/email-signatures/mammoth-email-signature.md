# Mammoth Email Signature — Mike Browne

Reference notes for the Mammoth Modern Insulation email signatures
hosted on the Sano site. Three options live concurrently — pick whichever
fits the moment and paste into Outlook.

## The three options

| Option | Route | Description | Banner | Take-Back |
|---|---|---|---|---|
| **Full** | <https://sano.nz/email-signature-mammoth> | The full version with five accreditation badges + Take Back strip | `mammoth-signature-banner.png` (720 × 286) | live HTML |
| **Option A** | <https://sano.nz/email-signature-mammoth-a> | Slim banner, no badges, NO Take Back strip | `mammoth-signature-slim.png` (720 × 211) | none |
| **Option B** | <https://sano.nz/email-signature-mammoth-b> | Slim banner, no badges, SLIM Take Back strip | `mammoth-signature-slim.png` (720 × 211) | live HTML (smaller padding/fonts than Full) |

Options A and B share the same banner image — A is just the banner,
B adds the slim Take Back strip beneath it.

## Take Back wording (canonical)

Every Take Back strip uses this exact wording:

> Recycling your offcuts? **Mammoth takes them back for free.**

If you regenerate or edit a signature, keep the wording identical.

## Hosted image assets

Served under `public/email/` → `https://sano.nz/email/`:

| File | Dimensions | Used by | Status |
|---|---|---|---|
| `mammoth-signature-banner.png` | 720 × 286 | Full | active |
| `mammoth-signature-slim.png` | 720 × 211 | Option A + Option B | active |
| `mammoth-signature-top.png` | 904 × 292 | (v1, no longer wired up) | retained |
| `mammoth-signature-cta.png` | 904 × 57  | (v1, no longer wired up) | retained |
| `mammoth-signature-full.png` | 904 × 349 | (v1, no longer wired up) | retained |

The v1 PNGs are kept hosted so any Outlook clients still running an
installed v1 signature don't break. They can be retired in a separate
cleanup once everyone is on the current options.

## Take Back strip — live HTML, not an image

Every Take Back row (Full + Option B) is built as live HTML, not as an
image. This means it always renders in Outlook / Gmail / Apple Mail,
even when remote images are blocked. The earlier v1 take-back row was
image-based and would drop out under image-blocking — the live HTML
fixes that.

Visual shape: grey bar (`#46413B`), white sans-serif text, red button
(`#EE2D24`) labelled *"Learn more ›"*. Outlook's classic engine renders
square corners (it ignores `border-radius`) — that's expected.

## Install in Outlook (desktop)

1. Open the option's preview URL in a browser (any of the three above).
2. Select all (Ctrl+A) and copy (Ctrl+C). Start the selection at
   *"Kind regards,"* so the prefix is included.
3. Outlook → File → Options → Mail → Signatures → New.
4. Paste (Ctrl+V) into the edit box. Save.

For Gmail / Apple Mail: same open-and-copy approach — Gmail Settings →
See all settings → General → Signature; Apple Mail Settings → Signatures.

## Links inside every signature

- Banner image → <https://mammoth.co.nz>
- Take-Back "Learn more" button (Full + Option B only) → <https://www.mammoth.co.nz/pages/recycle>

These are the only outbound links. No tracking pixels, no references
back to where the images are hosted.

## Repo touchpoints

- Preview routes:
  - `src/app/email-signature-mammoth/page.tsx` — Full
  - `src/app/email-signature-mammoth-a/page.tsx` — Option A
  - `src/app/email-signature-mammoth-b/page.tsx` — Option B
- Active assets:
  - `public/email/mammoth-signature-banner.png` (Full)
  - `public/email/mammoth-signature-slim.png` (Options A + B)
- Retained v1 assets:
  - `public/email/mammoth-signature-{top,cta,full}.png`

## Source packages

Generated through Claude design. The deploy packages live under
`F:\Sano\10-Branding\Marketing collateral\Email banner\` as
`Mammoth Signature A (deploy)` (Option A source) and
`Mammoth Signature B (deploy)` (Option B source). The Full v2 source
sits in its own `Mammoth Signature (deploy)` folder under the same
branding root.

To regenerate any banner: ask for a new package via Claude design,
drop the new PNG into `public/email/` with the matching filename,
and redeploy. The HTML routes don't need to change.
