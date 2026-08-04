import { renderCommercialIntro, listUnsubscribeHeader, hasUsableFullName } from '@/lib/campaigns/template'

describe('hasUsableFullName — strict name validation (no mail-merge greetings)', () => {
  it('accepts a real first + last name', () => {
    expect(hasUsableFullName('Yvonne Wood')).toBe(true)
    expect(hasUsableFullName('Paul Tuffin')).toBe(true)
    expect(hasUsableFullName("O'Brien Smith")).toBe(true)
  })
  it('rejects first-name-only, placeholders, inbox words, blanks', () => {
    for (const n of ['Paul', 'Simon', 'there', 'team', 'Office Manager X'.replace(/ X$/, ''), '', null, undefined, 'info', 'Reception Team']) {
      // 'info'/'Reception Team' contain junk tokens → rejected
      expect(hasUsableFullName(n as string | null)).toBe(false)
    }
  })
})

const base = {
  lead: { company: 'Acme Ltd', contact_name: 'Jane Smith' },
  token: 'tok123',
  siteUrl: 'https://sano.nz',
}

describe('commercial intro — Carol-voiced, sender-parameterised', () => {
  const email = renderCommercialIntro({ ...base, sender: { name: 'Carol Browne' } })

  it('greets the contact by first name and names the company', () => {
    expect(email.text).toContain('Hi Jane,')
    expect(email.text).toContain('cleaning at Acme Ltd')
  })

  it("uses the sender's first name in the body and full name in the signature", () => {
    expect(email.text).toContain("I'm Carol and I run Sano")
    expect(email.text).toContain('Carol Browne')
    expect(email.html).toContain('Carol Browne')
    // Not the old hardcoded owner name.
    expect(email.text).not.toContain('Michael Browne')
  })

  it('carries a functional opt-out (the "let me know" line)', () => {
    expect(email.text.toLowerCase()).toContain("won't follow up")
  })

  it('has one tracked link + the open pixel, no pricing or forbidden phrases', () => {
    expect(email.html).toContain('/api/campaigns/track/click/tok123')
    expect(email.html).toContain('/api/campaigns/track/open/tok123')
    for (const banned of ['premium', 'eco-friendly', 'industry-leading', '$']) {
      expect(email.text.toLowerCase()).not.toContain(banned)
    }
  })

  it('falls back to Michael Browne when no sender is given', () => {
    const e = renderCommercialIntro(base)
    expect(e.text).toContain('Michael Browne')
  })

  it('List-Unsubscribe header points at the reply-to', () => {
    expect(listUnsubscribeHeader('carol@sano.nz')['List-Unsubscribe']).toBe('<mailto:carol@sano.nz?subject=unsubscribe>')
  })

  it('named variant: greets by first name + asks if they are the right person', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: 'Jane Smith', email: 'jane@acme.co.nz' } })
    expect(e.variant).toBe('named')
    expect(e.text).toContain('Hi Jane,')
    expect(e.text).toContain('Would you happen to be the right person')
  })

  it('team variant: no reliable name → "Hi team", drops the "right person" question', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: null, email: 'info@acme.co.nz' } })
    expect(e.variant).toBe('team')
    expect(e.text).toContain('Hi team,')
    expect(e.text).not.toContain('right person')
    expect(e.text).toContain('point me in the direction of whoever looks after')
  })

  it('first-name-only falls back to the team greeting (never "Hi Paul,")', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: 'Paul', email: 'paul@acme.co.nz' } })
    expect(e.variant).toBe('team')
    expect(e.text).toContain('Hi team,')
  })

  it('never produces "Hi there", "Hi null" or a blank greeting', () => {
    for (const cn of [null, '', 'there', 'null', undefined]) {
      const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: cn as string | null } })
      expect(e.text).toContain('Hi team,')
      expect(e.text).not.toMatch(/Hi (there|null|,)/)
    }
  })

  it('uses a banner image in HTML when bannerUrl is set (alt still names the sender); text keeps the readable sig', () => {
    const e = renderCommercialIntro({ ...base, sender: { name: 'Carol Browne', bannerUrl: 'https://sano.nz/email/email-banner-carol.jpg' } })
    expect(e.html).toContain('email-banner-carol.jpg')
    expect(e.html).toContain('alt="Carol Browne — Sano | sano.nz"')
    // text/plain can't show images, so it still carries the readable signature.
    expect(e.text).toContain('Carol Browne')
    expect(e.text).toContain('0800 726 686')
  })
})
