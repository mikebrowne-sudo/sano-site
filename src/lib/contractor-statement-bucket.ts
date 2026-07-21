// Which bulk-workflow bucket a statement sits in. Pure + cheap (status /
// deadline / remittance link only). Reconciliation-level "needs attention" is
// surfaced separately by the process-payments dry-run, which reruns the real
// eligibility check.

export type StatementBucket =
  | 'ready_to_issue'
  | 'awaiting_review'
  | 'ready_to_pay'
  | 'remittance_unpaid'
  | 'needs_attention'
  | 'paid'

export const BUCKET_LABEL: Record<StatementBucket, string> = {
  ready_to_issue: 'Ready to issue',
  awaiting_review: 'Awaiting contractor review',
  ready_to_pay: 'Ready to pay',
  remittance_unpaid: 'Remittance created — unpaid',
  needs_attention: 'Needs attention',
  paid: 'Paid',
}

export const BUCKET_ORDER: StatementBucket[] = [
  'needs_attention', 'ready_to_issue', 'awaiting_review', 'ready_to_pay', 'remittance_unpaid', 'paid',
]

export interface BucketInput {
  status: string
  review_due_at: string | null
  remittance_id: string | null
}

export function statementBucket(s: BucketInput, nowIso: string): StatementBucket {
  if (s.status === 'paid') return 'paid'
  if (s.status === 'superseded') return 'needs_attention'
  if (s.status === 'draft') return 'ready_to_issue'
  // issued or confirmed:
  if (s.remittance_id) return 'remittance_unpaid' // linked but not yet paid (paid handled above)
  if (s.status === 'confirmed') return 'ready_to_pay'
  // issued, unlinked → deadline decides
  if (s.review_due_at && new Date(nowIso).getTime() > new Date(s.review_due_at).getTime()) return 'ready_to_pay'
  return 'awaiting_review'
}
