// Shared foundation for Admin Full Edit Mode (Stage 2).
//
// Small business rule: admins may edit almost anything when they
// intentionally choose to — but once a record has reached an advanced
// milestone (sent / accepted / completed / invoiced / paid / remitted) a
// reason is required and the change is audited. These pure helpers give
// every edit path one consistent shape: which milestone(s) a record is
// at, whether a reason is required, and a compact changed-field summary.
//
// The actual audit row is written by logSensitiveEdit (server action).

export type SensitiveEntity = 'quote' | 'job' | 'invoice' | 'contractor_invoice'

/** Advanced states a record may have reached at edit time. */
export interface Milestone {
  sent?: boolean
  accepted?: boolean
  completed?: boolean
  invoiced?: boolean
  paid?: boolean
  remitted?: boolean
}

export function entityTable(e: SensitiveEntity): string {
  switch (e) {
    case 'quote': return 'quotes'
    case 'job': return 'jobs'
    case 'invoice': return 'invoices'
    case 'contractor_invoice': return 'contractor_invoices'
  }
}

const MILESTONE_ORDER: (keyof Milestone)[] = ['sent', 'accepted', 'completed', 'invoiced', 'paid', 'remitted']

export function milestoneLabels(m: Milestone): string[] {
  return MILESTONE_ORDER.filter((k) => m[k])
}

/** A reason is required once a record has passed ANY advanced milestone. */
export function requiresReason(m: Milestone): boolean {
  return MILESTONE_ORDER.some((k) => m[k])
}

/** The strongest milestone reached — used to pick warning copy. */
export function highestMilestone(m: Milestone): keyof Milestone | null {
  for (let i = MILESTONE_ORDER.length - 1; i >= 0; i--) {
    if (m[MILESTONE_ORDER[i]]) return MILESTONE_ORDER[i]
  }
  return null
}

export interface FieldChange { field: string; before: unknown; after: unknown }

/**
 * Diff two flat records over a set of fields, returning only the fields
 * that actually changed (null-normalised). Keeps audit rows compact.
 */
export function summariseChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): FieldChange[] {
  const out: FieldChange[] = []
  for (const f of fields) {
    const b = before[f] ?? null
    const a = after[f] ?? null
    if (b !== a) out.push({ field: f, before: b, after: a })
  }
  return out
}
