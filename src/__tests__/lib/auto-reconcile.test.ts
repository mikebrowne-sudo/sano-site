import { payerKey, proposeAutoReconcile, referencedNumbers, sameDocNumber, suggestCreditMatches, type ArCredit, type ArInvoice } from '@/lib/auto-reconcile'

function credit(p: Partial<ArCredit>): ArCredit {
  return { id: 'c1', date: '2026-09-21', amount: 100, payee: 'D/C FROM SOMEONE', memo: '', cleared: false, allocated: 0, ...p }
}
function inv(p: Partial<ArInvoice>): ArInvoice {
  return {
    id: p.number ?? 'i1', number: 'INV-0001', status: 'sent', total: 100, allocated: 0,
    dateIssued: '2026-09-01', datePaid: null, clientId: 'client-a', clientLabel: 'Client A', ...p,
  }
}
const run = (credits: ArCredit[], invoices: ArInvoice[], history: Array<{ payerKey: string; clientId: string }> = []) =>
  proposeAutoReconcile({ credits, invoices, history })

describe('referencedNumbers — the ways customers actually write references', () => {
  it.each([
    ['INV-0277', ['INV-0277']],
    ['1-9Gowing Dr End Tenancy CleanInv0271', ['INV-0271']],
    ['inv o284 32 wharf rd', ['INV-0284']],
    ['Inv 0406  Mosque', ['INV-0406']],
    ['0331 0329', ['INV-0331', 'INV-0329']],
    ['QUO-0437', ['INV-0437']],
    ['Sue Bunce  26022', ['INV-26022']],
    ['Payment 2026', []],
  ])('%s', (text, expected) => {
    expect(referencedNumbers(text).sort()).toEqual([...expected].sort())
  })

  it('normalises payer names', () => {
    expect(payerKey('D/C FROM B&T Henderson')).toBe('B&T HENDERSON')
    expect(payerKey('D/C FROM From THE MARRIS FAMI')).toBe('THE MARRIS FAMI')
  })
})

describe('auto-reconcile — references', () => {
  it('allocates a payment whose reference matches the open balance', () => {
    const r = run([credit({ amount: 175, memo: 'INV-0277' })], [inv({ number: 'INV-0277', total: 175 })])
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0]).toMatchObject({ method: 'invoice_ref', allocations: [{ invoiceId: 'INV-0277', amount: 175 }] })
    expect(r.proposals[0].reason).toMatch(/^auto: reference INV-0277/)
  })

  it('splits one payment across two referenced invoices when they sum exactly', () => {
    const r = run(
      [credit({ amount: 1280, memo: '0331 0329' })],
      [inv({ number: 'INV-0331', total: 520 }), inv({ number: 'INV-0329', total: 760 })],
    )
    expect(r.proposals[0].allocations.map((a) => a.amount).sort()).toEqual([520, 760])
  })

  it('compares against the GST-inclusive balance minus what is already allocated', () => {
    const r = run([credit({ amount: 50, memo: 'INV-0005' })], [inv({ number: 'INV-0005', total: 115, allocated: 65 })])
    expect(r.proposals[0].allocations[0].amount).toBe(50)
  })

  it('leaves a part-payment against a reference for review', () => {
    const r = run([credit({ amount: 900, memo: 'INV-0308' })], [inv({ number: 'INV-0308', total: 1777.5 })])
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toMatch(/Reference found but amount differs|No unique/)
  })
})

describe('auto-reconcile — known payers and recurring clients', () => {
  const history = [{ payerKey: 'PUKEKOHE GOL', clientId: 'puke' }]

  it('pays a recurring client’s invoice by learned payer + exact amount', () => {
    const r = run(
      [credit({ amount: 2740, payee: 'D/C FROM Pukekohe Gol', memo: 'Pukekohe Golf Club', date: '2026-09-29' })],
      [inv({ number: 'INV-261001', total: 2740, clientId: 'puke', clientLabel: 'Pukekohe Golf Club', dateIssued: '2026-09-25' })],
      history,
    )
    expect(r.proposals[0]).toMatchObject({ method: 'amount_match', allocations: [{ invoiceId: 'INV-261001', amount: 2740 }] })
  })

  it('pays the oldest first when a client has several equal invoices open', () => {
    const r = run(
      [credit({ amount: 2740, payee: 'D/C FROM Pukekohe Gol', date: '2026-09-29' })],
      [
        inv({ number: 'INV-B', total: 2740, clientId: 'puke', dateIssued: '2026-09-25' }),
        inv({ number: 'INV-A', total: 2740, clientId: 'puke', dateIssued: '2026-08-25' }),
      ],
      history,
    )
    expect(r.proposals[0].allocations[0].invoiceId).toBe('INV-A')
    expect(r.proposals[0].reason).toMatch(/oldest of 2/)
  })

  it('matches a branch payer by name (B&T Henderson → Barfoot & Thompson Henderson)', () => {
    const r = run(
      [credit({ amount: 200, payee: 'D/C FROM B&T Henderson' })],
      [
        inv({ number: 'INV-H', total: 200, clientId: 'hend', clientLabel: 'Barfoot & Thompson Henderson' }),
        inv({ number: 'INV-P', total: 200, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' }),
      ],
    )
    expect(r.proposals[0].allocations[0].invoiceId).toBe('INV-H')
  })

  it('finds the one combination of a payer’s invoices that makes up a bundled payment', () => {
    const r = run(
      [credit({ amount: 1495, payee: 'D/C FROM B&T Ponsonby' })],
      [
        inv({ number: 'INV-1', total: 850, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' }),
        inv({ number: 'INV-2', total: 360, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' }),
        inv({ number: 'INV-3', total: 285, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' }),
        inv({ number: 'INV-4', total: 999, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' }),
      ],
    )
    expect(r.proposals[0].allocations.map((a) => a.invoiceId).sort()).toEqual(['INV-1', 'INV-2', 'INV-3'])
  })

  it('does not guess when two different combinations fit', () => {
    const r = run(
      [credit({ amount: 300, payee: 'D/C FROM B&T Ponsonby' })],
      ['A', 'B', 'C', 'D'].map((n, i) => inv({ number: `INV-${n}`, total: i < 2 ? 100 : 200, clientId: 'pons', clientLabel: 'Barfoot & Thompson Ponsonby' })),
    )
    expect(r.proposals).toHaveLength(0)
  })

  it('does not guess between different clients with the same amount', () => {
    const r = run(
      [credit({ amount: 200, payee: 'D/C FROM B&T Ponsonby' })],
      [inv({ number: 'INV-X', total: 200, clientId: 'x' }), inv({ number: 'INV-Y', total: 200, clientId: 'y' })],
      [{ payerKey: 'B&T PONSONBY', clientId: 'x' }, { payerKey: 'B&T PONSONBY', clientId: 'y' }],
    )
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toMatch(/different clients/)
  })

  it('never matches on amount alone from an unknown payer', () => {
    const r = run([credit({ amount: 450, payee: 'D/C FROM MS C C CABRERA' })], [inv({ number: 'INV-9', total: 450 })])
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toBe('Payer not recognised')
  })
})

describe('auto-reconcile — safety rules', () => {
  it('resolves a QUO reference through the quote, never by digits', () => {
    // INV-0491 belongs to someone else; the Abraham invoice made from QUO-0491 is INV-0510.
    const other = inv({ number: 'INV-0491', total: 480, clientId: 'other', clientLabel: 'Someone Else' })
    const r1 = run([credit({ amount: 480, payee: 'D/C FROM L M M ABRAHAM', memo: 'QUO-0491' })], [other])
    expect(r1.proposals).toHaveLength(0)

    const abraham = inv({ number: 'INV-0510', total: 480, clientId: 'abr', clientLabel: 'Chris & Luana Abraham', quoteNumber: 'QUO-0491' })
    const r2 = run([credit({ amount: 480, payee: 'D/C FROM L M M ABRAHAM', memo: 'QUO-0491' })], [other, abraham])
    expect(r2.proposals).toHaveLength(1)
    expect(r2.proposals[0]).toMatchObject({ method: 'invoice_ref', allocations: [{ invoiceId: 'INV-0510', amount: 480 }] })
  })

  it('never lets a same-amount invoice overrule the one named in the reference', () => {
    // Payer pays $200 quoting INV-0300 (owes $400 — a part payment). They also
    // have INV-0301 for exactly $200. The reference wins: no auto match.
    const invoices = [
      inv({ number: 'INV-0300', total: 400, clientId: 'story', clientLabel: 'Story' }),
      inv({ number: 'INV-0301', total: 200, clientId: 'story', clientLabel: 'Story' }),
    ]
    const r = run([credit({ amount: 200, payee: 'D/C FROM Story C N', memo: 'INV-0300' })], invoices, [{ payerKey: 'STORY C N', clientId: 'story' }])
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toMatch(/Reference INV-0300 found but the amount differs/)
  })

  it('still takes a bundle that includes the referenced invoice', () => {
    const invoices = [
      inv({ number: 'INV-0030', total: 310, clientId: 'story', clientLabel: 'Story' }),
      inv({ number: 'INV-0031', total: 310, clientId: 'story', clientLabel: 'Story' }),
    ]
    const r = run([credit({ amount: 620, payee: 'D/C FROM Story C N', memo: 'Inv-0031' })], invoices, [{ payerKey: 'STORY C N', clientId: 'story' }])
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0].allocations.map((x) => x.invoiceId).sort()).toEqual(['INV-0030', 'INV-0031'])
  })

  it('ignores an old paid-but-unallocated invoice unless it was marked paid near the payment', () => {
    const invoices = [inv({ number: 'INV-OLD', status: 'paid', total: 200, datePaid: '2026-05-18', clientId: 'hend', clientLabel: 'Barfoot & Thompson Henderson' })]
    const r = run([credit({ amount: 200, payee: 'D/C FROM B&T Henderson', date: '2026-08-14' })], invoices)
    expect(r.proposals).toHaveLength(0)
    const near = run([credit({ amount: 200, payee: 'D/C FROM B&T Henderson', date: '2026-05-14' })], invoices)
    expect(near.proposals).toHaveLength(1)
  })

  it('never auto-allocates tax refunds or owner money', () => {
    const r = run(
      [credit({ amount: 17.33, payee: 'D/C FROM I.R.D. 060-220-360', memo: 'INV-0001' })],
      [inv({ number: 'INV-0001', total: 17.33 })],
    )
    expect(r.proposals).toHaveLength(0)
  })

  it('never lets two payments claim the same invoice', () => {
    const r = run(
      [credit({ id: 'a', amount: 175, memo: 'INV-0047', date: '2026-05-18' }), credit({ id: 'b', amount: 175, memo: 'INV-0047', date: '2026-05-19' })],
      [inv({ number: 'INV-0047', total: 175 })],
    )
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0].creditId).toBe('a')
  })

  it('backfills an already-cleared payment only against paid invoices, flagged as backfill', () => {
    const r = run(
      [credit({ amount: 475, memo: 'INV-0018', cleared: true, date: '2026-04-20' })],
      [inv({ number: 'INV-0018', status: 'paid', total: 475, datePaid: '2026-04-29' })],
    )
    expect(r.proposals[0].backfill).toBe(true)
    const unpaid = run([credit({ amount: 475, memo: 'INV-0018', cleared: true })], [inv({ number: 'INV-0018', status: 'sent', total: 475 })])
    expect(unpaid.proposals).toHaveLength(0)
  })

  it('skips drafts and fully allocated payments', () => {
    expect(run([credit({ amount: 100, memo: 'INV-0001' })], [inv({ status: 'draft' })]).proposals).toHaveLength(0)
    expect(run([credit({ amount: 100, allocated: 100, memo: 'INV-0001' })], [inv({})]).proposals).toHaveLength(0)
  })
})

describe('auto-reconcile — bundle prefers invoices issued before the payment', () => {
  it('auto-matches the Royal Heights $1,570 even though a later $230 invoice could swap in', () => {
    const rh = { clientId: 'rh', clientLabel: 'Barfoot & Thompson Royal Heights' }
    const r = run(
      [credit({ amount: 1570, payee: 'D/C FROM B&T Royal Heights', date: '2026-09-30' })],
      [
        inv({ number: 'INV-0306', total: 900, dateIssued: '2026-08-23', ...rh }),
        inv({ number: 'INV-0383', total: 320, dateIssued: '2026-09-16', ...rh }),
        inv({ number: 'INV-0403', total: 230, dateIssued: '2026-09-16', ...rh }),
        inv({ number: 'INV-0320', total: 120, dateIssued: '2026-09-16', ...rh }),
        inv({ number: 'INV-0338', total: 230, dateIssued: '2026-10-03', ...rh }), // issued after the payment
      ],
    )
    expect(r.proposals[0].allocations.map((a) => a.invoiceId).sort()).toEqual(['INV-0306', 'INV-0320', 'INV-0383', 'INV-0403'])
  })
})

describe('suggestCreditMatches — the reconcile screen', () => {
  const sg = (c: Partial<ArCredit>, invoices: ArInvoice[], history: Array<{ payerKey: string; clientId: string }> = []) =>
    suggestCreditMatches({ credit: credit(c), invoices, history })

  it('offers a part payment against a referenced invoice, leaving the balance owing', () => {
    const r = sg({ amount: 1777.5, memo: 'INV-0308' }, [inv({ number: 'INV-0308', total: 3555 })])
    expect(r.suggestions[0]).toMatchObject({ kind: 'part_payment', allocations: [{ invoiceId: 'INV-0308', amount: 1777.5 }] })
    expect(r.suggestions[0].label).toMatch(/1777.50 still owing/)
  })

  it('ranks a payer bundle using only already-issued invoices first', () => {
    const rh = { clientId: 'rh', clientLabel: 'Barfoot & Thompson Royal Heights' }
    const r = sg({ amount: 350, payee: 'D/C FROM B&T Royal Heights', date: '2026-09-30' }, [
      inv({ number: 'A', total: 120, dateIssued: '2026-09-01', ...rh }),
      inv({ number: 'B', total: 230, dateIssued: '2026-09-02', ...rh }),
      inv({ number: 'LATE', total: 230, dateIssued: '2026-10-03', ...rh }),
    ])
    expect(r.suggestions[0].allocations.map((a) => a.invoiceId).sort()).toEqual(['A', 'B'])
    expect(r.clientIds).toEqual(['rh'])
  })

  it('warns when the referenced invoice is already paid in full', () => {
    const r = sg({ amount: 1080, memo: 'J Mulvany INV0340' }, [inv({ number: 'INV-0340', status: 'paid', total: 1080, allocated: 1080 })])
    expect(r.notes.join(' ')).toMatch(/INV-0340 is already paid in full/)
  })

  it('labels IRD money as a refund, not income', () => {
    const r = sg({ amount: 17.33, payee: 'D/C FROM I.R.D. 060-220-360' }, [])
    expect(r.suggestions).toHaveLength(0)
    expect(r.notes[0]).toMatch(/tax refund/)
  })

  it('only offers weak same-amount guesses when the payer is unknown', () => {
    const r = sg({ amount: 240, payee: 'D/C FROM L M M ABRAHAM' }, [inv({ number: 'INV-0430', total: 240, clientId: 'w', clientLabel: 'Wendell Property' })])
    expect(r.suggestions[0].kind).toBe('amount_only')
  })

  it('treats quote, job and invoice numbers alike', () => {
    expect(sameDocNumber('QUO-0491', 'JOB-0491')).toBe(true)
    expect(sameDocNumber('INV-0491', 'JOB-491')).toBe(true)
    expect(sameDocNumber('QUO-0414', 'JOB-0491')).toBe(false)
  })
})

describe('suggestCreditMatches — quote references', () => {
  it('suggests a part payment on the invoice made from the quoted QUO', () => {
    const abraham = inv({ number: 'INV-0510', total: 480, clientId: 'abr', clientLabel: 'Chris & Luana Abraham', quoteNumber: 'QUO-0491' })
    const s = suggestCreditMatches({ credit: credit({ amount: 240, payee: 'D/C FROM L M M ABRAHAM', memo: 'QUO-0491' }), invoices: [abraham], history: [] })
    expect(s.suggestions[0]).toMatchObject({ kind: 'part_payment', allocations: [{ invoiceId: 'INV-0510', amount: 240 }] })
  })
})
