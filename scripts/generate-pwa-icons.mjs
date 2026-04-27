// Phase 5.5.5 — One-shot PWA icon generator.
//
// Renders public/brand/sano-mark.svg onto a sage-50 background at the
// sizes the manifest expects. Maskable variant uses a deeper safe-zone
// (60% of canvas) so it survives Android adaptive-icon cropping.
//
// Run:  node scripts/generate-pwa-icons.mjs
//
// Re-run after editing the brand mark.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]):/, '$1:'), '..')
const SRC  = path.join(ROOT, 'public', 'brand', 'sano-mark.svg')
const OUT  = path.join(ROOT, 'public', 'icons')

const BG_LIGHT = { r: 247, g: 249, b: 247, alpha: 1 } // sage-50  #F7F9F7
const VARIANTS = [
  { name: 'icon-192.png',          size: 192, inner: 0.74, bg: BG_LIGHT },
  { name: 'icon-512.png',          size: 512, inner: 0.74, bg: BG_LIGHT },
  { name: 'icon-maskable-512.png', size: 512, inner: 0.60, bg: BG_LIGHT },
]

await fs.mkdir(OUT, { recursive: true })
const svg = await fs.readFile(SRC)

for (const v of VARIANTS) {
  const inner = Math.round(v.size * v.inner)
  const mark  = await sharp(svg).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const out   = await sharp({ create: { width: v.size, height: v.size, channels: 4, background: v.bg } })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
  await fs.writeFile(path.join(OUT, v.name), out)
  console.log(`✓ ${v.name}  ${v.size}×${v.size}  (mark ${inner}px)`)
}
