import { preferContact } from '@/lib/review-recipient'

describe('preferContact', () => {
  const business = { name: 'Barfoot & Thompson', email: 'accounts@barfoot.co.nz', phone: '099990000' }

  it('prefers the contact person over the business/accounts record', () => {
    const r = preferContact(
      { full_name: 'Jordan Lee', email: 'jordan@barfoot.co.nz', phone: '0211234567' },
      business,
    )
    expect(r).toEqual({ name: 'Jordan Lee', email: 'jordan@barfoot.co.nz', phone: '0211234567' })
  })

  it('falls back to the client record when there is no contact', () => {
    expect(preferContact(null, business)).toEqual({
      name: 'Barfoot & Thompson',
      email: 'accounts@barfoot.co.nz',
      phone: '099990000',
    })
  })

  it('falls back per-field when the contact is missing some details', () => {
    const r = preferContact({ full_name: 'Jordan Lee', email: null, phone: '  ' }, business)
    expect(r.name).toBe('Jordan Lee')
    expect(r.email).toBe('accounts@barfoot.co.nz') // contact email blank → client
    expect(r.phone).toBe('099990000') // contact phone whitespace → client
  })

  it('returns nulls when nothing is available', () => {
    expect(preferContact(null, null)).toEqual({ name: null, email: null, phone: null })
    expect(preferContact({ full_name: '  ', email: '', phone: null }, {})).toEqual({
      name: null,
      email: null,
      phone: null,
    })
  })
})
