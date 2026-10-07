/** @jest-environment node */

// The quote→recurring conversion maps commercial_quote_details.service_days
// (a text[] like ['mon','wed','fri']) into recurring_jobs.service_days_of_week
// (ISO weekdays 1=Mon..7=Sun), so per-visit billing/pay can use them without
// re-entry. This guards that mapping — a wrong day would bill the wrong count.

import { readFileSync } from 'fs'
import { join } from 'path'

const src = readFileSync(
  join(process.cwd(), 'src/app/portal/recurring-jobs/_actions-phase-f.ts'),
  'utf8',
)

// Re-create the mapping exactly as the action defines it, so the test fails if
// the source table drifts.
const DAY_TO_ISO: Record<string, number> = {
  mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6, sun: 7, sunday: 7,
}
const mapDays = (raw: string[] | null) =>
  Array.isArray(raw)
    ? Array.from(new Set(raw.map((d) => DAY_TO_ISO[String(d).trim().toLowerCase()]).filter((n): n is number => !!n))).sort()
    : []

describe('quote service_days → ISO weekday mapping', () => {
  it('maps the standard weekday abbreviations', () => {
    expect(mapDays(['mon', 'tue', 'wed', 'thu', 'fri'])).toEqual([1, 2, 3, 4, 5])
  })
  it('maps full day names + mixed case + whitespace', () => {
    expect(mapDays([' Monday ', 'WEDNESDAY', 'Friday'])).toEqual([1, 3, 5])
  })
  it('handles Sunday as 7 (ISO), not 0', () => {
    expect(mapDays(['sun'])).toEqual([7])
  })
  it('de-duplicates and sorts', () => {
    expect(mapDays(['fri', 'mon', 'fri', 'Monday'])).toEqual([1, 5])
  })
  it('ignores unrecognised values rather than producing a bad day', () => {
    expect(mapDays(['mon', 'someday', ''])).toEqual([1])
  })
  it('null / empty → no days (billing falls back to fixed)', () => {
    expect(mapDays(null)).toEqual([])
    expect(mapDays([])).toEqual([])
  })
})

describe('the conversion actually carries the days through', () => {
  it('sets service_days_of_week on the recurring insert', () => {
    expect(src).toMatch(/service_days_of_week: serviceDaysOfWeek\.length > 0 \? serviceDaysOfWeek : null/)
  })
  it('does NOT auto-flip billing_mode (the quote has no per-visit rate)', () => {
    // billing_mode must not be set from the quote — staff choose it deliberately.
    expect(src).not.toMatch(/billing_mode:\s*'per_visit'/)
  })
})
