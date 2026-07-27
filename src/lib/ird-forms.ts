// IRD tax & KiwiSaver forms shown on the onboarding Documents step. Sano hosts a
// copy of the forms it collects (IR330, KS2) for convenience, with a link to the
// always-current version on ird.govt.nz alongside — a hosted copy can go stale,
// so the IRD link is the source of truth. KS10 (opt-out) is a later process, so
// it's a reference link only, not a hosted copy.
//
// Hosted PDFs live in /public/forms. Update them from ird.govt.nz when IRD
// revises a form (check the "modified" date on the IRD page).

export interface IrdForm {
  code: string          // e.g. 'IR330'
  title: string         // human title, e.g. 'Tax code declaration'
  blurb: string         // one short line
  /** 'done' = captured online earlier in the wizard; 'later' = only if needed after starting. */
  status: 'done' | 'later'
  /** Path to Sano's hosted copy under /public, or null for an IRD link only. */
  hostedPath: string | null
  /** Always-current version on ird.govt.nz. */
  irdUrl: string
}

export const IRD_ONBOARDING_FORMS: readonly IrdForm[] = [
  {
    code: 'IR330',
    title: 'Tax code declaration',
    blurb: 'Completed in the Tax & KiwiSaver step — no paper form needed.',
    status: 'done',
    hostedPath: '/forms/IR330.pdf',
    irdUrl: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/complete-my-tax-code-declaration',
  },
  {
    code: 'KS2',
    title: 'KiwiSaver deduction form',
    blurb: 'Your membership and contribution rate were captured there (3.5% by default).',
    status: 'done',
    hostedPath: '/forms/KS2.pdf',
    irdUrl: 'https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir1---ir99/ks2/ks2.pdf',
  },
  {
    code: 'KS10',
    title: 'KiwiSaver opt-out request',
    blurb: 'Only if you’re auto-enrolled and choose to opt out — after you start (day 14–56), via this form or myIR.',
    status: 'later',
    hostedPath: '/forms/KS10.pdf',
    irdUrl: 'https://www.ird.govt.nz/kiwisaver/kiwisaver-individuals/opting-out-of-kiwisaver/opt-out-of-kiwisaver',
  },
]
