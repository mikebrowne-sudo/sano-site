import { renderCommercialIntro, renderCommercialFollowup, listUnsubscribeHeader, hasUsableFullName } from '@/lib/campaigns/template'

describe('renderCommercialFollowup — one light nudge, threaded, same name split', () => {
  const base = { lead: { company: 'Acme Ltd', contact_name: 'Jane Smith', email: 'jane@acme.co.nz' }, token: 't', siteUrl: 'https://sano.nz', originalSubject: 'Cleaning at Acme Ltd', sender: { name: 'Carol Browne' } }

  it('named: greets by name, "follow up ... in case it was missed", keeps the "someone else" line, threads as Re:', () => {
    const e = renderCommercialFollowup(base)
    expect(e.variant).toBe('named')
    expect(e.subject).toBe('Re: Cleaning at Acme Ltd')
    expect(e.text).toContain('Hi Jane,')
    expect(e.text).toContain('follow up on my email below')
    expect(e.text).toContain("someone else I'd be better speaking with")
  })

  it('team: "Hi team" + drops the "someone else" sentence', () => {
    const e = renderCommercialFollowup({ ...base, lead: { company: 'Acme Ltd', contact_name: null, email: 'info@acme.co.nz' } })
    expect(e.variant).toBe('team')
    expect(e.text).toContain('Hi team,')
    expect(e.text).not.toContain('someone else')
  })

  it('does not double up "Re:" when the original already has it', () => {
    expect(renderCommercialFollowup({ ...base, originalSubject: 'Re: Cleaning at Acme Ltd' }).subject).toBe('Re: Cleaning at Acme Ltd')
  })
})

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

  it('uses a PLAIN sano.nz link and NO open-tracking pixel, no pricing or forbidden phrases', () => {
    // Per spec: no tracked/redirected click link AND no open-tracking pixel — we
    // don't use opens for follow-up decisions, and both make a personal email
    // read as a campaign. Only a plain sano.nz link remains.
    expect(email.html).not.toContain('/api/campaigns/track/click/')
    expect(email.html).not.toContain('/api/campaigns/track/open/')
    expect(email.html).not.toContain('width="1"') // the 1x1 pixel is gone
    expect(email.html).toContain('href="https://sano.nz"')
    for (const banned of ['premium', 'eco-friendly', 'industry-leading', '$']) {
      expect(email.text.toLowerCase()).not.toContain(banned)
    }
  })

  it('text signature includes the reply email when provided (Carol’s contact details)', () => {
    const e = renderCommercialIntro({ ...base, sender: { name: 'Carol Browne', email: 'carol@sano.nz' } })
    expect(e.text).toContain('Carol Browne')
    expect(e.text).toContain('carol@sano.nz')
    expect(e.text).toContain('0800 726 686')
    expect(e.text).toContain('sano.nz')
  })

  it('falls back to Michael Browne when no sender is given', () => {
    const e = renderCommercialIntro(base)
    expect(e.text).toContain('Michael Browne')
  })

  it('List-Unsubscribe header points at the reply-to', () => {
    expect(listUnsubscribeHeader('carol@sano.nz')['List-Unsubscribe']).toBe('<mailto:carol@sano.nz?subject=unsubscribe>')
  })

  it('named variant: greets by first name + uses the named ask-line', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: 'Jane Smith', email: 'jane@acme.co.nz' } })
    expect(e.variant).toBe('named')
    expect(e.text).toContain('Hi Jane,')
    expect(e.text).toContain("If this isn't something you look after, I'd really appreciate you pointing me towards the best person to speak with.")
    // Both HTML and plain-text carry the same ask-line (esc() doesn't touch apostrophes).
    expect(e.html).toContain("If this isn't something you look after, I'd really appreciate you pointing me towards the best person to speak with.")
    // Old salesy phrasing is gone.
    expect(e.text).not.toContain('right person to speak with?')
    expect(e.text).not.toContain('Would you happen to be')
  })

  it('team variant: no reliable name → "Hi team" + the team ask-line', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: null, email: 'info@acme.co.nz' } })
    expect(e.variant).toBe('team')
    expect(e.text).toContain('Hi team,')
    expect(e.text).toContain('If someone in the team could point me towards the best person to speak with about this, I\'d really appreciate it.')
    expect(e.html).toContain('If someone in the team could point me towards the best person')
    // Team version must not carry the named "if this isn't something you look after" opener.
    expect(e.text).not.toContain("If this isn't something you look after")
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
