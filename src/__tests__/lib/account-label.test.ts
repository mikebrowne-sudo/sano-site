import { accountLabel } from '@/lib/account-label'

describe('accountLabel', () => {
  it('combines name and company for a branch account', () => {
    expect(accountLabel('Barfoot & Thompson', 'Greenlane')).toBe('Barfoot & Thompson — Greenlane')
  })

  it('does not duplicate when the name already carries the branch', () => {
    expect(accountLabel('Ray White Lochores - Birkenhead', null)).toBe('Ray White Lochores - Birkenhead')
    expect(accountLabel('Ray White Lochores - Birkenhead', 'Birkenhead')).toBe('Ray White Lochores - Birkenhead')
  })

  it('does not duplicate when name equals or includes the company', () => {
    expect(accountLabel('Wendell Property', 'Wendell Property')).toBe('Wendell Property')
    expect(accountLabel('Sansom Limited Auckland', 'Sansom Limited')).toBe('Sansom Limited Auckland')
  })

  it('handles blanks', () => {
    expect(accountLabel('', 'Greenlane')).toBe('Greenlane')
    expect(accountLabel('Acme', null)).toBe('Acme')
    expect(accountLabel('Acme', '')).toBe('Acme')
  })
})
