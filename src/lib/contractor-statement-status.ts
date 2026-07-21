// Derived display status for a contractor statement (staff + contractor UI).
// Pure: caller passes the current instant so it stays deterministic in tests.

export interface StatementStatusInput {
  status: string
  viewed_at: string | null
  review_due_at: string | null
  confirmed_source: string | null
}

export type StatementDisplayStatus =
  | 'draft'
  | 'not_viewed'
  | 'viewed'
  | 'overdue'
  | 'confirmed_contractor'
  | 'confirmed_sano'
  | 'superseded'
  | 'paid'

export const STATEMENT_STATUS_LABEL: Record<StatementDisplayStatus, string> = {
  draft: 'Draft',
  not_viewed: 'Not viewed',
  viewed: 'Viewed — awaiting confirmation',
  overdue: 'Overdue',
  confirmed_contractor: 'Confirmed by contractor',
  confirmed_sano: 'Confirmed by Sano',
  superseded: 'Superseded',
  paid: 'Paid',
}

export function statementDisplayStatus(s: StatementStatusInput, nowIso: string): StatementDisplayStatus {
  switch (s.status) {
    case 'draft': return 'draft'
    case 'superseded': return 'superseded'
    case 'paid': return 'paid'
    case 'confirmed': return s.confirmed_source === 'sano' ? 'confirmed_sano' : 'confirmed_contractor'
    case 'issued': {
      if (s.review_due_at && new Date(nowIso).getTime() > new Date(s.review_due_at).getTime()) return 'overdue'
      return s.viewed_at ? 'viewed' : 'not_viewed'
    }
    default: return 'not_viewed'
  }
}
