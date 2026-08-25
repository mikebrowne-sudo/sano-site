/**
 * Manual (operator-written) scope sections.
 *
 * The Scope of Works page is generated from costed commercial_scope_items.
 * Manual sections are free text stored in a jsonb column and appended to
 * that page — presentational only, never costed.
 *
 * Two things need pinning: the jsonb parser (the column can hold anything,
 * and malformed data must never reach a client-facing PDF), and the
 * payload append (manual sections must follow the generated ones and must
 * NOT leak into "Areas covered").
 */

import { parseManualScopeSections } from '@/lib/commercialQuote'
import { manualScopeItemsFromText } from '@/app/portal/quotes/_components/commercial/CommercialDetailsSection'

describe('parseManualScopeSections', () => {
  it('parses well-formed sections', () => {
    expect(
      parseManualScopeSections([
        { title: 'Deep clean extras', items: ['Degrease filters', 'Steam clean seating'] },
      ]),
    ).toEqual([{ title: 'Deep clean extras', items: ['Degrease filters', 'Steam clean seating'] }])
  })

  it('allows a blank title (an untitled list of extras is valid)', () => {
    expect(parseManualScopeSections([{ title: '', items: ['Wash glass'] }])).toEqual([
      { title: '', items: ['Wash glass'] },
    ])
  })

  it('drops sections with no usable items', () => {
    expect(
      parseManualScopeSections([
        { title: 'Empty heading', items: [] },
        { title: 'Blank lines only', items: ['', '   '] },
        { title: 'Good', items: ['Real task'] },
      ]),
    ).toEqual([{ title: 'Good', items: ['Real task'] }])
  })

  it('trims whitespace on titles and items', () => {
    expect(parseManualScopeSections([{ title: '  Extras  ', items: ['  Wash glass  '] }])).toEqual([
      { title: 'Extras', items: ['Wash glass'] },
    ])
  })

  // The column is jsonb — a bad write or hand-edit must never reach a PDF.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not an array'],
    ['a number', 42],
    ['an object', { title: 'x', items: ['y'] }],
  ])('returns [] for %s', (_label, input) => {
    expect(parseManualScopeSections(input)).toEqual([])
  })

  it('skips malformed entries inside an otherwise valid array', () => {
    expect(
      parseManualScopeSections([
        null,
        'nope',
        42,
        ['nested'],
        { items: ['no title key'] },
        { title: 'No items key' },
        { title: 'Good', items: ['Real task'] },
      ]),
    ).toEqual([
      { title: '', items: ['no title key'] },
      { title: 'Good', items: ['Real task'] },
    ])
  })

  it('drops non-string items rather than rendering them', () => {
    expect(
      parseManualScopeSections([{ title: 'Mixed', items: ['Good', 42, null, { a: 1 }, 'Also good'] }]),
    ).toEqual([{ title: 'Mixed', items: ['Good', 'Also good'] }])
  })
})

describe('manualScopeItemsFromText', () => {
  it('splits one item per line', () => {
    expect(manualScopeItemsFromText('Degrease filters\nSteam clean seating')).toEqual([
      'Degrease filters',
      'Steam clean seating',
    ])
  })

  it('drops blank lines', () => {
    expect(manualScopeItemsFromText('One\n\n  \nTwo')).toEqual(['One', 'Two'])
  })

  it('strips pasted bullet characters (the proposal renders its own)', () => {
    expect(manualScopeItemsFromText('- Dash item\n• Bullet item\n* Star item\n· Middot item')).toEqual([
      'Dash item',
      'Bullet item',
      'Star item',
      'Middot item',
    ])
  })

  it('handles CRLF line endings', () => {
    expect(manualScopeItemsFromText('One\r\nTwo')).toEqual(['One', 'Two'])
  })

  it('returns [] for empty input', () => {
    expect(manualScopeItemsFromText('')).toEqual([])
    expect(manualScopeItemsFromText('   \n  ')).toEqual([])
  })

  it('does not strip a hyphen that is part of the task text', () => {
    expect(manualScopeItemsFromText('Deep-clean the extraction hood')).toEqual([
      'Deep-clean the extraction hood',
    ])
  })
})
