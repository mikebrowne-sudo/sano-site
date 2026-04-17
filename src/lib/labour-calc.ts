export interface WorkerCost {
  contractorId: string
  fullName: string
  hourlyRate: number
  hoursAllocated: number
  cost: number
}

export interface LabourSummary {
  workers: WorkerCost[]
  totalLabourCost: number
  grossProfit: number
  marginPercent: number
}

export function calculateLabour(
  jobValue: number,
  allowedHours: number | null,
  workers: { contractor_id: string; full_name: string; hourly_rate: number | null; hours_allocated: number | null }[],
): LabourSummary {
  if (!allowedHours || allowedHours <= 0 || workers.length === 0) {
    return { workers: [], totalLabourCost: 0, grossProfit: jobValue, marginPercent: jobValue > 0 ? 100 : 0 }
  }

  const workerCosts: WorkerCost[] = workers.map((w) => {
    const rate = w.hourly_rate ?? 0
    // Use explicitly allocated hours, or split evenly
    const hours = w.hours_allocated ?? (allowedHours / workers.length)
    return {
      contractorId: w.contractor_id,
      fullName: w.full_name,
      hourlyRate: rate,
      hoursAllocated: hours,
      cost: rate * hours,
    }
  })

  const totalLabourCost = workerCosts.reduce((sum, w) => sum + w.cost, 0)
  const grossProfit = jobValue - totalLabourCost
  const marginPercent = jobValue > 0 ? Math.round((grossProfit / jobValue) * 100) : 0

  return { workers: workerCosts, totalLabourCost, grossProfit, marginPercent }
}
