// Single source of truth for the "Why choose Sano" cards shared across every
// suburb service-area page (/service-area/<suburb>).
//
// These four cards are deliberately suburb-AGNOSTIC — they describe what to
// expect from Sano on any clean, regardless of the property or the reason, and
// must never mention a specific suburb. Each page still passes its own
// `heading` and `subtitle` to <WhyChooseSection>; only the `items` array is
// shared here so the wording stays identical everywhere.
//
// Card 2 ("A properly finished clean") supersedes the earlier "Careful
// cleaners" card: "careful" is no longer used as a lead descriptor on suburb
// pages. Extracting these to one constant keeps all suburb pages aligned and
// makes future wording changes a one-file edit.

export interface SuburbWhySanoItem {
  title: string
  body: string
}

export const SUBURB_WHY_SANO_ITEMS: readonly SuburbWhySanoItem[] = [
  {
    title: 'Clear scopes and simple quotes',
    body: 'Scope and pricing agreed upfront. Send through the property details and the service you need, and we come back with a clear, practical quote.',
  },
  {
    title: 'A properly finished clean',
    body: 'Methodical work that covers the detail as well as the obvious areas, leaving the property feeling clean, presentable, and properly looked after.',
  },
  {
    title: 'Insured and vetted teams',
    body: 'All cleaners background-checked, trained, and fully insured.',
  },
  {
    title: 'Follow-up if needed',
    body: 'If something is missed, let us know and we will make it right where reasonable.',
  },
]
