// Staff "action centre" task model — PURE + testable.
//
// Turns live counts of outstanding work into an ordered checklist. Each task
// is a real thing to action (approve pay, send a remittance, chase an
// invoice…). A task is DONE when its count hits zero — the UI ticks it and
// strikes it through. Every task deep-links to the exact page to do it, and
// carries a plain-English helper that a staff member can show/hide per task.

export interface StaffTaskCounts {
  payApprovals: number
  remittancesToSend: number
  remittancesToPay: number
  invoicesToSend: number
  invoicesOverdue: number
  unassignedJobs: number
}

export interface StaffTask {
  key: string
  title: string
  /** How many items need actioning (0 = done). */
  count: number
  done: boolean
  /** Deep link to the page where the task is completed. */
  href: string
  /** Plain-English "how to do this" shown behind the per-task helper toggle. */
  helper: string
}

interface TaskDef {
  key: keyof StaffTaskCounts
  title: string
  href: string
  helper: string
}

// Order = the natural contractor-pay → billing → scheduling workflow.
const TASK_DEFS: TaskDef[] = [
  {
    key: 'payApprovals',
    title: 'Approve contractor pay',
    href: '/portal/contractor-invoices/pending-approvals',
    helper:
      'Open Pending pay approvals. For each completed job, check the hours — or switch to “Set amount” for non-hourly work like rubbish removal or carpet cleaning — then tap Approve. Approving creates the payable that you later bundle into a remittance.',
  },
  {
    key: 'remittancesToSend',
    title: 'Send remittance advices',
    href: '/portal/contractor-invoices/remittances',
    helper:
      'Open a remittance marked “Not sent”, check the lines look right, then tap Send. It emails the advice to the contractor.',
  },
  {
    key: 'remittancesToPay',
    title: 'Mark remittances paid',
    href: '/portal/contractor-invoices/remittances',
    helper:
      'Once you’ve actually paid the contractor from the bank, open their remittance and tap Mark paid so it shows as paid to them.',
  },
  {
    key: 'invoicesToSend',
    title: 'Send draft invoices',
    href: '/portal/invoices',
    helper:
      'These invoices are still drafts. Open each one, check the details, and tap Send to email it to the client.',
  },
  {
    key: 'invoicesOverdue',
    title: 'Chase overdue invoices',
    href: '/portal/alerts',
    helper:
      'These invoices are past their due date and still unpaid. Follow the client up — or mark the invoice paid if the money has already landed.',
  },
  {
    key: 'unassignedJobs',
    title: 'Schedule unassigned jobs',
    href: '/portal/jobs?tab=needs_scheduling',
    helper:
      'These jobs don’t have a cleaner yet. Open each one and assign a contractor and a date so it shows up in their app.',
  },
]

export function buildStaffTasks(counts: StaffTaskCounts): StaffTask[] {
  return TASK_DEFS.map((d) => {
    const count = counts[d.key] ?? 0
    return { key: d.key, title: d.title, href: d.href, helper: d.helper, count, done: count === 0 }
  })
}

/** True when everything is actioned — used for the "all clear" state. */
export function allTasksDone(tasks: StaffTask[]): boolean {
  return tasks.every((t) => t.done)
}
