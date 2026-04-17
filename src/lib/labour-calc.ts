const DEFAULT_ACC_RATE = 0.017 // 1.7%

export interface WorkerInput {
  contractor_id: string
  full_name: string
  hourly_rate: number | null
  hours_allocated: number | null
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
  hoursAllocated: number
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

export function calculateLabour(
  jobValue: number,
  allowedHours: number | null,
  workers: WorkerInput[],
  accRate?: number,
): LabourSummary {
  const acc = accRate ?? DEFAULT_ACC_RATE

  if (!workers.length) {
    return { workers: [], totalLabourCost: 0, totalAccCost: 0, totalEmployerKs: 0, totalHours: 0, grossProfit: jobValue, marginPercent: jobValue > 0 ? 100 : 0 }
  }

  const workerCosts: WorkerCost[] = workers.map((w) => {
    const rate = w.hourly_rate ?? 0
    const hours = w.hours_allocated ?? (allowedHours ? allowedHours / workers.length : 0)
    const workerType = w.worker_type ?? 'contractor'
    const isEmployee = workerType !== 'contractor'

    const basePay = rate * hours

    if (!isEmployee) {
      // Contractor: simple rate × hours, no payroll costs
      return {
        contractorId: w.contractor_id,
        fullName: w.full_name,
        workerType,
        hoursAllocated: hours,
        hourlyRate: rate,
        basePay,
        holidayPay: 0,
        grossPayForCosting: basePay,
        employerKiwisaver: 0,
        accCost: 0,
        totalCost: basePay,
      }
    }

    // Employee: apply holiday pay, employer KS, ACC
    const isPaygo = w.holiday_pay_method === 'pay_as_you_go_8_percent'
    const holidayPct = isPaygo ? ((w.holiday_pay_percent ?? 8) / 100) : 0
    const holidayPay = Math.round(basePay * holidayPct * 100) / 100
    const grossPayForCosting = basePay + holidayPay

    const employerKsRate = w.kiwisaver_enrolled ? ((w.kiwisaver_employer_rate ?? 3) / 100) : 0
    const employerKiwisaver = Math.round(grossPayForCosting * employerKsRate * 100) / 100
    const accCost = Math.round(grossPayForCosting * acc * 100) / 100

    const totalCost = grossPayForCosting + employerKiwisaver + accCost

    return {
      contractorId: w.contractor_id,
      fullName: w.full_name,
      workerType,
      hoursAllocated: hours,
      hourlyRate: rate,
      basePay,
      holidayPay,
      grossPayForCosting,
      employerKiwisaver,
      accCost,
      totalCost: Math.round(totalCost * 100) / 100,
    }
  })

  const totalLabourCost = workerCosts.reduce((s, w) => s + w.totalCost, 0)
  const totalAccCost = workerCosts.reduce((s, w) => s + w.accCost, 0)
  const totalEmployerKs = workerCosts.reduce((s, w) => s + w.employerKiwisaver, 0)
  const totalHours = workerCosts.reduce((s, w) => s + w.hoursAllocated, 0)
  const grossProfit = jobValue - totalLabourCost
  const marginPercent = jobValue > 0 ? Math.round((grossProfit / jobValue) * 100) : 0

  return { workers: workerCosts, totalLabourCost, totalAccCost, totalEmployerKs, totalHours, grossProfit, marginPercent }
}
