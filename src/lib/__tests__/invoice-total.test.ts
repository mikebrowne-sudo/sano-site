import { calculateInvoiceTotal } from '../invoice-total'

describe('calculateInvoiceTotal — addon semantic', () => {
  it('returns base_price when no items and no discount (residential single-line)', () => {
    expect(calculateInvoiceTotal({ base_price: 280 }, [])).toBe(280)
  })

  it('adds items as addons on top of base_price (INV-0018 pattern)', () => {
    // base $415 + waiting time $60 = $475
    expect(calculateInvoiceTotal({ base_price: 415 }, [{ price: 60 }])).toBe(475)
  })

  it('subtracts discount from base_price + items', () => {
    expect(calculateInvoiceTotal({ base_price: 545, discount: 45 }, [])).toBe(500)
  })

  it('multiple addons sum correctly', () => {
    expect(
      calculateInvoiceTotal({ base_price: 300 }, [{ price: 50 }, { price: 25 }]),
    ).toBe(375)
  })

  it('null base_price treated as 0; items provide the total', () => {
    expect(calculateInvoiceTotal({ base_price: null }, [{ price: 480 }])).toBe(480)
  })

  it('floors at 0 — never goes negative when discount exceeds total', () => {
    expect(calculateInvoiceTotal({ base_price: 100, discount: 200 }, [])).toBe(0)
  })

  it('Phase 5.5.16 regression — quote $480 → job → invoice = $480 (not $960)', () => {
    // Post-fix shape: createInvoiceFromJob writes ONLY base_price,
    // skipping the duplicate line item that previously caused the
    // double-count. The total must be $480, not $960.
    expect(calculateInvoiceTotal({ base_price: 480 }, [])).toBe(480)
  })

  it('Phase 5.5.16 regression — pre-fix bad shape would have produced 960', () => {
    // Documents the BAD historical shape so the formula's behaviour
    // is explicit. Going forward, createInvoiceFromJob never produces
    // this shape; it can only exist on legacy rows that need backfill.
    expect(
      calculateInvoiceTotal({ base_price: 480 }, [{ price: 480 }]),
    ).toBe(960)
  })
})
