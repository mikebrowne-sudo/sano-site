import type {
  HowWeWorkBlock,
  ServiceOption,
} from './types'

export const proposalIntroduction = `Thank you for the opportunity to put this together. We've pulled the following proposal based on the site walk-through and what you've told us matters most — a building that looks after itself, a team that's easy to deal with, and standards that hold up week after week.

Sano looks after commercial spaces across Auckland. We're a small, tightly-run operation, which means the people on your site are the same people you'll speak to when something needs sorting. No layers, no hand-offs, no surprises.`

export const proposalHowWeWork: HowWeWorkBlock[] = [
  {
    title: 'One team, one point of contact',
    body: 'You get a single account lead who knows your site, your team, and your standards. No call centres, no ticketing system — just someone who picks up.',
  },
  {
    title: 'Trained, vetted cleaners',
    body: 'Every cleaner on your site is fully inducted, reference-checked, and trained to our commercial standard before their first shift. We don\'t send strangers.',
  },
  {
    title: 'Quiet, consistent delivery',
    body: 'We work to a clear scope and a written schedule, so you always know what\'s being done and when. If something changes, you hear it from us first.',
  },
  {
    title: 'Straightforward communication',
    body: 'Short monthly check-ins, a simple way to flag issues, and fast follow-up when something needs attention. We\'d rather get ahead of problems than explain them later.',
  },
]

export const proposalServiceOptions: ServiceOption[] = [
  {
    title: 'Essential',
    description: 'The core clean — floors, bathrooms, kitchens, touchpoints, and waste — delivered to a reliable standard on a consistent schedule. A solid base for sites that need dependable upkeep without extras.',
  },
  {
    title: 'Standard',
    description: 'Everything in Essential, plus a deeper rotating detail program covering glass, internal surfaces, and higher-touch areas. Suited to sites with visitor traffic or a shared public face.',
  },
  {
    title: 'Premium',
    description: 'Our most complete service. Full rotating detail, periodic deep-clean days, documented quality checks, and priority response. Built for sites where presentation is part of the brand.',
  },
]

export const proposalIncludedItems: string[] = [
  'All cleaning labour and on-site supervision',
  'Standard commercial consumables (cloths, pads, chemicals)',
  'Colour-coded equipment to prevent cross-contamination',
  'Rubbish and recycling removal to on-site bins',
  'Monthly site check-in and scope review',
  'Public liability insurance ($2M) and certificates of currency on request',
  'H&S inductions and site-specific SSSP compliance',
]

export const proposalExcludedItems: string[] = [
  'Consumables stocked in your facilities (paper, soap, hand towel)',
  'Specialist carpet extraction and hard-floor restoration',
  'External window cleaning above ground-floor level',
  'Builder\'s cleans and post-construction make-readies',
  'One-off moves, event turnovers, or emergency callouts',
  'Pest control, landscaping, and waste-stream removal',
]

export const proposalPaymentTerms: string[] = [
  'Invoices issued on the first business day of each month for the month prior.',
  'Payment terms are the 20th of the month following invoice.',
  'All prices are in NZD and exclude GST unless stated otherwise.',
  'Rates are reviewed annually, or sooner if scope or frequency changes materially.',
  'Additional or ad-hoc work is quoted separately and billed on completion.',
]

export const proposalTermsOverview: string[] = [
  'This proposal is valid for 30 days from the proposal date.',
  'Either party may end the agreement with 30 days\' written notice.',
  'Public holidays falling on a scheduled service day are made up by agreement.',
  'Access, keys, and alarm codes are handled through your site\'s standard onboarding process.',
  'A full service agreement is provided on acceptance and forms the binding contract.',
]

export const proposalAcceptanceBlurb = `To accept this proposal, confirm in writing (email is fine) or sign below. We\'ll then send through the full service agreement, confirm a start date, and get the site induction booked in. If anything needs adjusting — scope, frequency, start date — just flag it and we\'ll work it through with you.`
