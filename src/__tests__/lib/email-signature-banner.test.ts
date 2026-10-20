/** @jest-environment node */

// The signature banner images are ~1665px native but are declared at a smaller
// display width. WITHOUT `max-width: 100%` a client that honours the fixed width
// (or a narrow window) renders them oversized and they blow out the message
// body — this has now bitten twice (campaign template, then the copy-paste
// Outlook signature pages). These guards keep the email-safe pattern in place.

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('campaign email banner is email-safe', () => {
  const src = read('src/lib/campaigns/template.ts')
  it('uses a fixed width plus max-width:100% (never width:100% alone)', () => {
    expect(src).toMatch(/width:850px;max-width:100%/)
    // width:100% on an oversized source is what ballooned it originally.
    expect(src).not.toMatch(/<img[^>]*style="[^"]*width:100%[^"]*"[^>]*email-banner/)
  })
})

describe('copy-paste Outlook signature pages are email-safe', () => {
  it("Carol's signature banner has maxWidth 100%", () => {
    const src = read('src/app/email-signature/page.tsx')
    expect(src).toMatch(/maxWidth: '100%'/)
  })
  it("Michael's signature banner has maxWidth 100%", () => {
    const src = read('src/app/email-signature-michael/page.tsx')
    expect(src).toMatch(/maxWidth: '100%'/)
  })
})

// Classic Outlook ignores CSS sizing on pasted signature images and shows the
// file at its native pixel size, so the signature images must BE their display width.
describe('signature banner files are native display size', () => {
  const jpegWidth = (p: string) => {
    const b = readFileSync(join(process.cwd(), p))
    let i = 2
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      if (m >= 0xc0 && m <= 0xc3) return b.readUInt16BE(i + 7)
      i += 2 + b.readUInt16BE(i + 2)
    }
    return -1
  }
  it.each([
    ['carol', 'src/app/email-signature/page.tsx', 850],
    ['michael', 'src/app/email-signature-michael/page.tsx', 1000],
  ] as const)('%s signature image file matches its display width', (n, page, w) => {
    expect(jpegWidth(`public/email/email-signature-${n}.jpg`)).toBe(w)
    const src = read(page)
    expect(src).toContain(`/email/email-signature-${n}.jpg`)
    expect(src).toContain(`width="${w}"`)
  })
})
