// "Also send invoices to": parsing what staff type on the client, and building
// the CC list for one send without repeating the To address.

import { invoiceCcList, parseCcEmails } from '@/lib/invoice-cc'

describe('parseCcEmails', () => {
  it('splits on commas, semicolons, spaces and new lines', () => {
    expect(parseCcEmails('a@x.nz, b@y.co.nz;c@z.com\nd@w.org  e@v.nz').emails)
      .toEqual(['a@x.nz', 'b@y.co.nz', 'c@z.com', 'd@w.org', 'e@v.nz'])
  })

  it('drops duplicates regardless of case and keeps the first spelling', () => {
    expect(parseCcEmails('Bella@Gmail.com, bella@gmail.com').emails).toEqual(['Bella@Gmail.com'])
  })

  it('reports anything that is not an email', () => {
    const r = parseCcEmails('ok@x.nz, nope, also@bad')
    expect(r.emails).toEqual(['ok@x.nz'])
    expect(r.invalid).toEqual(['nope', 'also@bad'])
  })

  it('treats blank input as an empty list', () => {
    expect(parseCcEmails('  ,  ')).toEqual({ emails: [], invalid: [] })
  })
})

describe('invoiceCcList', () => {
  it('merges lists, skips the To address and duplicates', () => {
    expect(invoiceCcList('Bella@gmail.com', ['partner@x.nz', 'bella@gmail.com'], ['PARTNER@x.nz', 'acc@y.nz']))
      .toEqual(['partner@x.nz', 'acc@y.nz'])
  })

  it('copes with missing lists and blank entries', () => {
    expect(invoiceCcList('a@x.nz', null, undefined, [null, '', '  b@y.nz '])).toEqual(['b@y.nz'])
  })
})
