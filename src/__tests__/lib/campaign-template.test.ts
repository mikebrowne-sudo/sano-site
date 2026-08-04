import { renderCommercialIntro, listUnsubscribeHeader } from '@/lib/campaigns/template'

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

  it('greets "there" when no contact name', () => {
    const e = renderCommercialIntro({ ...base, lead: { company: 'Acme Ltd', contact_name: null } })
    expect(e.text).toContain('Hi there,')
  })
})
