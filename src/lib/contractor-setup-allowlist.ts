// The ONLY contractor record fields a contractor may propose changes to via the
// public secure link. Identity / structure / bank-account-NAME only — never a
// rate, customer, commercial term, GST or tax field. Exported so the token
// action and the security tests share one source of truth (a regression that
// widened this would fail the test).

export const CONTRACTOR_PROPOSABLE_FIELDS = [
  'full_name',
  'preferred_name',
  'phone',
  'address',
  'business_structure',
  'legal_name',
  'nzbn',
  'company_number',
  'bank_account_name',
] as const

export type ContractorProposableField = (typeof CONTRACTOR_PROPOSABLE_FIELDS)[number]

/** Set form for O(1) membership checks in the action. */
export const CONTRACTOR_PROPOSABLE_SET: ReadonlySet<string> = new Set(CONTRACTOR_PROPOSABLE_FIELDS)
