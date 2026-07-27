// First-pay readiness checklist. The first real pay is always manually approved;
// this surfaces what's confirmed vs outstanding so staff decide with eyes open.
// It is advisory (it informs; it does not hard-block) — and a still-processing
// EMP registration is explicitly non-blocking, shown as 'pending', never as
// filed/accepted. Pure + testable.

export type ReadinessStatus = 'pass' | 'warn' | 'pending'

export interface ReadinessItem {
  key: string
  label: string
  status: ReadinessStatus
  detail: string
}

export interface FirstPayReadinessInput {
  agreementSigned: boolean
  ir330Received: boolean
  bankAccount: string | null
  /** Must be a settled status — 'review_required' is not yet confirmed. */
  kiwisaverStatus: string | null
  /** KS3/KS10 info pack delivery recorded. */
  infoPackRecorded: boolean
  /** Staff have compared the computed pay to the IRD calculator / IR340. */
  irdCompared: boolean
  /** Sano's employer (EMP) registration is live (vs still processing). */
  empRegistered: boolean
}

export function firstPayReadiness(i: FirstPayReadinessInput): ReadinessItem[] {
  const ksSettled = !!i.kiwisaverStatus && i.kiwisaverStatus !== 'review_required'
  return [
    { key: 'agreement', label: 'Signed employment agreement',
      status: i.agreementSigned ? 'pass' : 'warn',
      detail: i.agreementSigned ? 'Signed.' : 'No signed agreement on file.' },
    { key: 'ir330', label: 'Completed IR330 tax code declaration',
      status: i.ir330Received ? 'pass' : 'warn',
      detail: i.ir330Received ? 'Received.' : 'IR330 not recorded — ND tax code applies until it is.' },
    { key: 'bank', label: 'Confirmed bank account',
      status: i.bankAccount?.trim() ? 'pass' : 'warn',
      detail: i.bankAccount?.trim() ? i.bankAccount : 'No bank account on file.' },
    { key: 'kiwisaver', label: 'Current KiwiSaver status',
      status: ksSettled ? 'pass' : 'warn',
      detail: ksSettled ? `Status: ${i.kiwisaverStatus}.` : 'KiwiSaver status needs confirming (currently review required).' },
    { key: 'info_pack', label: 'KiwiSaver information pack recorded',
      status: i.infoPackRecorded ? 'pass' : 'warn',
      detail: i.infoPackRecorded ? 'KS3/KS10 pack delivery recorded.' : 'Info pack delivery not recorded (must be within 7 days of starting).' },
    { key: 'ird_compared', label: 'Payroll compared with IRD calculator / IR340',
      status: i.irdCompared ? 'pass' : 'warn',
      detail: i.irdCompared ? 'Confirmed against IRD.' : 'Not yet compared to the IRD calculator / IR340 table.' },
    { key: 'emp', label: 'Employer registration & payday filing',
      // Non-blocking: a pending EMP registration must never read as filed/accepted.
      status: i.empRegistered ? 'pass' : 'pending',
      detail: i.empRegistered
        ? 'EMP registered; payday filing available.'
        : 'EMP registration pending — payday filing required and not yet possible. Does not block payment.' },
  ]
}

/** Non-EMP items that are still outstanding (EMP pending is deliberately excluded). */
export function readinessOutstanding(items: ReadinessItem[]): ReadinessItem[] {
  return items.filter((it) => it.key !== 'emp' && it.status !== 'pass')
}
