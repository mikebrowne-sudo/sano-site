/**
 * Two client-facing proposal faults found by reading the Hallertau Riverhead
 * output:
 *
 *  1. Service days printed in click order — "Sunday, Friday, Saturday and
 *     Tuesday". Reads as carelessness before the reader reaches the price.
 *  2. Every venue row fell into "General Areas", and the wet area beside the
 *     kitchen landed under "Kitchens & Breakout Areas" — office vocabulary on
 *     a brewery proposal.
 */

import { formatServiceDays } from '@/lib/proposals/content-builders'
import { groupScopeForProposal } from '@/lib/commercialProposalMapping'
import type { CommercialScopeItem } from '@/lib/commercialQuote'

describe('formatServiceDays — always week order', () => {
  it('sorts days clicked out of order', () => {
    // The exact string from the Hallertau proposal.
    expect(formatServiceDays('Sun, Fri, Sat, Tue'))
      .toBe('Tuesday, Friday, Saturday and Sunday')
  })

  it('handles a normal Mon-Thu selection', () => {
    expect(formatServiceDays('Mon, Tue, Wed, Thu'))
      .toBe('Monday, Tuesday, Wednesday and Thursday')
  })

  it('sorts a two-day contract', () => {
    expect(formatServiceDays('Fri, Wed')).toBe('Wednesday and Friday')
  })

  it('de-duplicates a repeated day', () => {
    expect(formatServiceDays('Mon, Mon, Wed')).toBe('Monday and Wednesday')
  })

  it('leaves the shorthand forms alone', () => {
    expect(formatServiceDays('Weekdays')).toBe('Monday to Friday')
    expect(formatServiceDays('Every day')).toBe('every day')
  })

  it('returns a single day unchanged', () => {
    expect(formatServiceDays('Wed')).toBe('Wednesday')
  })
})

describe('scope grouping — hospitality rows land in venue sections', () => {
  /** Group label a single task lands in, via the public grouping path. */
  const g = (task_name: string): string => {
    const row = {
      id: 'r1', task_name, included: true, display_order: 0,
      area_type: null, task_group: null, frequency: 'per_visit', notes: null,
    } as unknown as CommercialScopeItem
    return groupScopeForProposal([row])[0]?.label ?? '(none)'
  }

  it('files bar work under Bar & Service Areas', () => {
    expect(g('Bar surfaces and wet area beside kitchen')).toBe('Bar & Service Areas')
    expect(g('Move light items, clean behind bar and working benches')).toBe('Bar & Service Areas')
  })

  it('does NOT file the bar wet area under Kitchens', () => {
    // The specific misfiling in the Hallertau proposal.
    expect(g('Dust mop and damp mop wet area beside kitchen')).not.toBe('Kitchens & Breakout Areas')
  })

  it('files outdoor work under Outdoor Areas', () => {
    expect(g('Limestone — rake and collect rubbish')).toBe('Outdoor Areas')
    expect(g('Playground bark — tidy and collect rubbish')).toBe('Outdoor Areas')
    expect(g('Stone paving — waterblast')).toBe('Outdoor Areas')
  })

  it('files dining work under Dining & Public Areas', () => {
    expect(g('Tables, chairs and high-touch points')).toBe('Dining & Public Areas')
  })

  it('still files bathrooms correctly', () => {
    expect(g('Toilet cubicles — clean, sanitise, restock')).toBe('Bathrooms & Washrooms')
    expect(g('Urinals — clean, sanitise')).toBe('Bathrooms & Washrooms')
  })

  it('leaves genuine office rows unchanged', () => {
    expect(g('Desks and workstations — wipe')).toBe('Workstations')
    expect(g('Staff kitchen and breakout room')).toBe('Kitchens & Breakout Areas')
  })
})
