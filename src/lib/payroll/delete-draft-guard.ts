// Safety guard for deleting a pay run. ONLY a draft with no downstream records
// may be deleted — approved/paid/completed runs and anything with a payslip,
// payday-filing progress or an IRD liability line are permanent. Pure + testable;
// the server action calls this before touching anything.

export interface DeleteDraftInput {
  status: string | null
  paidAt: string | null
  /** Payday-filing status; anything past 'not_filed' means it's in flight. */
  filingStatus: string | null
  payslips: number
  liabilityLines: number
}

export function canDeletePayRunDraft(i: DeleteDraftInput): { ok: boolean; reason?: string } {
  if (i.status !== 'draft') return { ok: false, reason: `Only a draft pay run can be deleted (this one is "${i.status ?? 'unknown'}").` }
  if (i.paidAt) return { ok: false, reason: 'This run has been paid and cannot be deleted.' }
  if ((i.filingStatus ?? 'not_filed') !== 'not_filed') return { ok: false, reason: `This run's payday filing is "${i.filingStatus}" and cannot be deleted.` }
  if (i.payslips > 0) return { ok: false, reason: 'This run has payslips and cannot be deleted.' }
  if (i.liabilityLines > 0) return { ok: false, reason: 'This run has an IRD liability record and cannot be deleted.' }
  return { ok: true }
}
