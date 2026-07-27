// IRD tax & KiwiSaver forms shown on the onboarding Documents step. Sano hosts a
// copy of the forms it collects (IR330, KS2) for convenience, with a link to the
// always-current version on ird.govt.nz alongside — a hosted copy can go stale,
// so the IRD link is the source of truth. KS10 (opt-out) is a later process, so
// it's a reference link only, not a hosted copy.
//
// Hosted PDFs live in /public/forms. Update them from ird.govt.nz when IRD
// revises a form (check the "modified" date on the IRD page).

export interface IrdForm {
  code: string
  title: string
  blurb: string
  /** Path to Sano's hosted copy under /public, or null for an IRD link only. */
  hostedPath: string | null
  /** Always-current version on ird.govt.nz. */
  irdUrl: string
  /** True when this is captured online in the wizard (no action needed on paper). */
  doneOnline: boolean
}

export const IRD_ONBOARDING_FORMS: readonly IrdForm[] = [
  {
    code: 'IR330',
    title: 'Tax code declaration (IR330)',
    blurb: 'You complete this online in the Tax & KiwiSaver step — no paper form needed. A copy is here for your records.',
    hostedPath: '/forms/IR330.pdf',
    irdUrl: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/complete-my-tax-code-declaration',
    doneOnline: true,
  },
  {
    code: 'KS2',
    title: 'KiwiSaver deduction form (KS2)',
    blurb: 'Your KiwiSaver membership and contribution rate are captured online in the same step. If you don’t choose a rate, the default 3.5% applies.',
    hostedPath: '/forms/KS2.pdf',
    irdUrl: 'https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir1---ir99/ks2/ks2.pdf',
    doneOnline: true,
  },
  {
    code: 'KS10',
    title: 'KiwiSaver opt-out request (KS10)',
    blurb: 'Only if you’re automatically enrolled and choose to opt out — done after you start (day 14–56), on this form or through myIR. Not part of signing.',
    hostedPath: null,
    irdUrl: 'https://www.ird.govt.nz/kiwisaver/kiwisaver-individuals/opting-out-of-kiwisaver/opt-out-of-kiwisaver',
    doneOnline: false,
  },
]
