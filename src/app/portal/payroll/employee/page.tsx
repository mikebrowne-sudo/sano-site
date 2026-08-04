// The old casual-employee pay helper (employee_pay_runs) is retired — that
// table was never created in prod and nobody was paid through it. Employee pay
// now runs on the full system at /portal/payroll (mileage auto-pull, KiwiSaver,
// holiday accrual, payslips, IRD ledger, Pay-this-week). This route redirects
// there so old links / the Pay hub can't land on the dead page.

import { redirect } from 'next/navigation'

export default function RetiredEmployeePayrollPage() {
  redirect('/portal/payroll')
}
