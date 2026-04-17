const DEFAULT_ACC_RATE = 0.017 // 1.7%

export interface WorkerInput {
  contractor_id: string
  full_name: string
  hourly_rate: number | null
  hours_allocated: number | null
  actual_hours: number | null
  worker_type: string | null
  holiday_pay_method: string | null
  holiday_pay_percent: number | null
  kiwisaver_enrolled: boolean
  kiwisaver_employer_rate: number | null
}

export interface WorkerCost {
  contractorId: string
  fullName: string
  workerType: string
  hours: number
  hourlyRate: number
  basePay: number
  holidayPay: number
  grossPayForCosting: number
  employerKiwisaver: number
  accCost: number
  totalCost: number
}

export interface LabourSummary {
  workers: WorkerCost[]
  totalLabourCost: number
  totalAccCost: number
  totalEmployerKs: number
  totalHours: number
  grossProfit: number
  marginPercent: number
}

export interface VarianceSummary {
  estimated: LabourSummary
  actual: LabourSummary
  hoursVariance: number
  costVariance: number
  marginVariance: number
}

function calcWorkerCost(
  hours: number,
  rate: number,
  workerType: string,
  holidayPayMethod: string | null,
  holidayPayPercent: number | null,
  ksEnrolled: boolean,
  ksEmployerRate: number | null,
  accRate: number,
): Omit<WorkerCost, 'contractorId' | 'fullName' | 'workerType'> {
  const basePay = rate * hours
  const isEmployee = workerType !== 'contractor'

  if (!isEmployee) {
    return { hours, hourlyRate: rate, basePay, holidayPay: 0, grossPayForCosting: basePay, employerKiwisaver: 0, accCost: 0, totalCost: basePay }
  }

  const isPaygo = holidayPayMethod === 'pay_as_you_go_8_percent'
  const holidayPct = isPaygo ? ((holidayPayPercent ?? 8) / 100) : 0
  const holidayPay = Math.round(basePay * holidayPct * 100) / 100
  const grossPayForCosting = basePay + holidayPay

  const employerKsRate = ksEnrolled ? ((ksEmployerRate ?? 3) / 100) : 0
  const employerKiwisaver = Math.round(grossPayForCosting * employerKsRate * 100) / 100
  const accCost = Math.round(grossPayForCosting * accRate * 100) / 100
  const totalCost = Math.round((grossPayForCosting + employerKiwisaver + accCost) * 100) / 100

  return { hours, hourlyRate: rate, basePay, holidayPay, grossPayForCosting, employerKiwisaver, accCost, totalCost }
}

function buildSummary(
  jobValue: number,
  workers: WorkerInput[],
  useActual: boolean,
  allowedHours: number | null,
  accRate: number,
): LabourSummary {
  if (!workers.length) {
    return { workers: [], totalLabourCost: 0, totalAccCost: 0, totalEmployerKs: 0, totalHours: 0, grossProfit: jobValue, marginPercent: jobValue > 0 ? 100 : 0 }
  }

  const workerCosts: WorkerCost[] = workers.map((w) => {
    const rate = w.hourly_rate ?? 0
    const hours = useActual
      ? (w.actual_hours ?? 0)
      : (w.hours_allocated ?? (allowedHours ? allowedHours / workers.length : 0))
    const wt = w.worker_type ?? 'contractor'

    const cost = calcWorkerCost(hours, rate, wt, w.holiday_pay_method, w.holiday_pay_percent, w.kiwisaver_enrolled, w.kiwisaver_employer_rate, accRate)

    return { contractorId: w.contractor_id, fullName: w.full_name, workerType: wt, ...cost }
  })

  const totalLabourCost = workerCosts.reduce((s, w) => s + w.totalCost, 0)
  const totalAccCost = workerCosts.reduce((s, w) => s + w.accCost, 0)
  const totalEmployerKs = workerCosts.reduce((s, w) => s + w.employerKiwisaver, 0)
  const totalHours = workerCosts.reduce((s, w) => s + w.hours, 0)
  const grossProfit = jobValue - totalLabourCost
  const marginPercent = jobValue > 0 ? Math.round((grossProfit / jobValue) * 100) : 0

  return { workers: workerCosts, totalLabourCost, totalAccCost, totalEmployerKs, totalHours, grossProfit, marginPercent }
}

export function calculateLabour(
  jobValue: number,
  allowedHours: number | null,
  workers: WorkerInput[],
  accRate?: number,
): LabourSummary {
  return buildSummary(jobValue, workers, false, allowedHours, accRate ?? DEFAULT_ACC_RATE)
}

export function calculateActualLabour(
  jobValue: number,
  workers: WorkerInput[],
  accRate?: number,
): LabourSummary {
  return buildSummary(jobValue, workers, true, null, accRate ?? DEFAULT_ACC_RATE)
}

export function calculateVariance(
  jobValue: number,
  allowedHours: number | null,
  workers: WorkerInput[],
  accRate?: number,
): VarianceSummary {
  const acc = accRate ?? DEFAULT_ACC_RATE
  const estimated = buildSummary(jobValue, workers, false, allowedHours, acc)
  const actual = buildSummary(jobValue, workers, true, null, acc)

  return {
    estimated,
    actual,
    hoursVariance: actual.totalHours - estimated.totalHours,
    costVariance: actual.totalLabourCost - estimated.totalLabourCost,
    marginVariance: actual.grossProfit - estimated.grossProfit,
  }
}
