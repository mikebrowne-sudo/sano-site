import { mondayOf, weekDays, suburbOf } from '@/app/contractor/_components/ContractorWeekView'

describe('contractor week view helpers', () => {
  it('weeks start on Monday', () => {
    expect(mondayOf('2026-10-14')).toBe('2026-10-12') // Wed
    expect(mondayOf('2026-10-12')).toBe('2026-10-12') // Mon
    expect(mondayOf('2026-10-18')).toBe('2026-10-12') // Sun
    expect(mondayOf('2026-11-01')).toBe('2026-10-26') // across a month
  })

  it('lists Monday to Sunday', () => {
    expect(weekDays('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
  })

  it('pulls the suburb out of an address', () => {
    expect(suburbOf('34 Douglas Street, Ponsonby')).toBe('Ponsonby')
    expect(suburbOf('8 Victoria Avenue, Remuera, Auckland 1050')).toBe('Remuera')
    expect(suburbOf('21 Hurstmere Road, Takapuna 0622, Auckland')).toBe('Takapuna')
    expect(suburbOf('58B Trias Road')).toBe('58B Trias Road')
    expect(suburbOf(null)).toBeNull()
  })
})
