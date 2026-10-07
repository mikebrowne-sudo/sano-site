// Default selection rule for Pay Run payables.
//
// Pure + DB-free so the rule is unit-testable and identical wherever it runs.
//
// The rule: a pay run should sweep up everything due BY the end of the selected
// period — the period's own work plus any older unpaid backlog — but never work
// that belongs to a LATER period.
//
//   service date <= period end   -> selected   (current period + overdue backlog)
//   service date >  period end   -> not selected (next period's work)
//   no service date              -> NOT selected, surfaced for review
//
// On the undated default: an unticked undated item is visible and one click
// away from inclusion; a ticked one gets paid unless someone notices and
// unticks it. Given the double-payments this system has already produced, the
// safer failure mode is "paid late", not "paid unnoticed". So undated items are
// surfaced with a review label rather than silently swept in.
//
// With no period selected (the "everything owed" default) there is no later
// period to exclude, so every dated payable is selected.

export interface SelectablePayable {
  ciId: string
  /** Resolved service date (ISO yyyy-mm-dd), or null when unresolvable. */
  serviceDate: string | null
}

export type SelectionReason = 'in_period' | 'overdue' | 'later_period' | 'undated'

export interface PayableSelectionState {
  ciId: string
  selected: boolean
  reason: SelectionReason
}

/**
 * Classify one payable against the selected period.
 * `periodStart`/`periodEnd` are ISO dates; both null = no period filter.
 */
export function classifyPayable(
  p: SelectablePayable,
  periodStart: string | null,
  periodEnd: string | null,
): PayableSelectionState {
  if (!p.serviceDate) {
    // Never silently swept in — see the note above.
    return { ciId: p.ciId, selected: false, reason: 'undated' }
  }
  if (periodEnd && p.serviceDate > periodEnd) {
    return { ciId: p.ciId, selected: false, reason: 'later_period' }
  }
  if (periodStart && p.serviceDate < periodStart) {
    // Older unpaid work — overdue, and due in this run.
    return { ciId: p.ciId, selected: true, reason: 'overdue' }
  }
  return { ciId: p.ciId, selected: true, reason: 'in_period' }
}

/** The default tick-set for a list of payables. */
export function defaultSelection(
  payables: SelectablePayable[],
  periodStart: string | null,
  periodEnd: string | null,
): Set<string> {
  const out = new Set<string>()
  for (const p of payables) {
    if (classifyPayable(p, periodStart, periodEnd).selected) out.add(p.ciId)
  }
  return out
}

export const REASON_LABEL: Record<SelectionReason, string | null> = {
  in_period: null,                          // the normal case needs no badge
  overdue: 'Older unpaid',
  later_period: 'Next period',
  undated: 'Date unavailable — review',
}
