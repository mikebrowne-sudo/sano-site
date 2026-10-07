import {
  isNeverGstCategory,
  resolveGstInclusive,
  normaliseExpenseCategory,
  expenseCategoryLabel,
  SELECTABLE_EXPENSE_CATEGORIES,
} from '@/lib/expense-categories'

describe('isNeverGstCategory', () => {
  it('is true for categories that are not a supply to the business', () => {
    // Employee wages sit outside the GST system entirely.
    expect(isNeverGstCategory('wages_payroll')).toBe(true)
    // PAYE / GST / tax remitted to IRD is money held on behalf.
    expect(isNeverGstCategory('ird_payment')).toBe(true)
    // Capital introduced and loans are not supplies.
    expect(isNeverGstCategory('owner_capital')).toBe(true)
    expect(isNeverGstCategory('director_loan')).toBe(true)
  })

  it('is FALSE for contractor payments', () => {
    // A GST-registered contractor's invoice does carry claimable GST. Whether a
    // given payment qualifies depends on that contractor's verified GST status
    // on the supply date — never on the category alone.
    expect(isNeverGstCategory('contractor_payment')).toBe(false)
  })

  it('is false for ordinary operating categories', () => {
    expect(isNeverGstCategory('insurance')).toBe(false)
    expect(isNeverGstCategory('software_subscriptions')).toBe(false)
    expect(isNeverGstCategory('materials_supplies')).toBe(false)
    expect(isNeverGstCategory('capital_expense')).toBe(false)
    expect(isNeverGstCategory('other')).toBe(false)
  })

  it('is false for unknown or missing values', () => {
    expect(isNeverGstCategory(null)).toBe(false)
    expect(isNeverGstCategory(undefined)).toBe(false)
    expect(isNeverGstCategory('not_a_category')).toBe(false)
  })
})

describe('resolveGstInclusive', () => {
  it('forces false for a never-GST category even when entered true', () => {
    // The real defect: a $1,000 owner-capital row flagged GST-inclusive
    // silently claimed $130.43 that was never claimable.
    expect(resolveGstInclusive('owner_capital', true)).toBe(false)
    expect(resolveGstInclusive('ird_payment', true)).toBe(false)
    expect(resolveGstInclusive('wages_payroll', true)).toBe(false)
    expect(resolveGstInclusive('director_loan', true)).toBe(false)
  })

  it('keeps the operator flag for a claimable category', () => {
    expect(resolveGstInclusive('contractor_payment', true)).toBe(true)
    expect(resolveGstInclusive('contractor_payment', false)).toBe(false)
    expect(resolveGstInclusive('insurance', true)).toBe(true)
    expect(resolveGstInclusive('insurance', false)).toBe(false)
  })

  it('keeps false as false everywhere', () => {
    expect(resolveGstInclusive('owner_capital', false)).toBe(false)
    expect(resolveGstInclusive('other', false)).toBe(false)
  })

  it('treats an unknown category as claimable (operator decides)', () => {
    expect(resolveGstInclusive('not_a_category', true)).toBe(true)
  })
})

describe('the new categories are usable', () => {
  it('contractor_payment and ird_payment are offered in the picker', () => {
    const values = SELECTABLE_EXPENSE_CATEGORIES.map((c) => c.value)
    expect(values).toContain('contractor_payment')
    expect(values).toContain('ird_payment')
  })

  it('both normalise to themselves rather than falling back to other', () => {
    expect(normaliseExpenseCategory('contractor_payment')).toBe('contractor_payment')
    expect(normaliseExpenseCategory('ird_payment')).toBe('ird_payment')
  })

  it('wages_payroll is labelled so it cannot be confused with contractor pay', () => {
    expect(expenseCategoryLabel('wages_payroll')).toMatch(/employee/i)
    expect(expenseCategoryLabel('contractor_payment')).toBe('Contractor payment')
  })

  it('an IRD payment is flagged as not an ordinary operating expense', () => {
    const ird = SELECTABLE_EXPENSE_CATEGORIES.find((c) => c.value === 'ird_payment')
    expect(ird?.accountantConfirm).toBe(true)
  })
})
