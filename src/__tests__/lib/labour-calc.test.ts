// Unit tests for the labour-calc pay_rate precedence rule introduced
// in Phase G.1. The calculator is also exercised indirectly by the
// job detail page; these tests pin the contract directly.

import { calculateLabour, calculateActualLabour, type WorkerInput } from '@/lib/labour-calc'

function worker(partial: Partial<WorkerInput> = {}): WorkerInput {
  return {
    contractor_id: 'c1',
    full_name: 'Test Worker',
    hourly_rate: null,
    hours_allocated: null,
    actual_hours: null,
    worker_type: 'contractor',
    holiday_pay_method: null,
    holiday_pay_percent: null,
    kiwisaver_enrolled: false,
    kiwisaver_employer_rate: null,
    ...partial,
  }
}

describe('labour-calc — pay_rate precedence (Phase G.1)', () => {
  it('uses pay_rate when present, ignoring hourly_rate', () => {
    const w = worker({ pay_rate: 50, hourly_rate: 99, hours_allocated: 4 })
    const summary = calculateLabour(500, 4, [w])
    // contractor: basePay = 50 × 4 = 200; totalCost = 200
    expect(summary.workers[0].hourlyRate).toBe(50)
    expect(summary.workers[0].totalCost).toBe(200)
    expect(summary.totalLabourCost).toBe(200)
  })

  it('falls back to hourly_rate when pay_rate is null', () => {
    const w = worker({ pay_rate: null, hourly_rate: 40, hours_allocated: 4 })
    const summary = calculateLabour(500, 4, [w])
    expect(summary.workers[0].hourlyRate).toBe(40)
    expect(summary.workers[0].totalCost).toBe(160)
  })

  it('falls back to hourly_rate when pay_rate is omitted entirely', () => {
    // Backward-compat: callers that don't set pay_rate still work.
    const w = worker({ hourly_rate: 30, hours_allocated: 2 })
    const summary = calculateLabour(500, 2, [w])
    expect(summary.workers[0].hourlyRate).toBe(30)
    expect(summary.workers[0].totalCost).toBe(60)
  })

  it('treats pay_rate=0 as a valid override (not a missing value)', () => {
    // ?? treats null/undefined as missing; 0 should pass through.
    const w = worker({ pay_rate: 0, hourly_rate: 50, hours_allocated: 4 })
    const summary = calculateLabour(500, 4, [w])
    expect(summary.workers[0].hourlyRate).toBe(0)
    expect(summary.workers[0].totalCost).toBe(0)
  })

  it('uses pay_rate on the actual-hours calculation too', () => {
    const w = worker({ pay_rate: 50, hourly_rate: 99, actual_hours: 5 })
    const summary = calculateActualLabour(500, [w])
    expect(summary.workers[0].hourlyRate).toBe(50)
    expect(summary.workers[0].totalCost).toBe(250)
  })

  it('mixes pay_rate and hourly_rate per worker independently', () => {
    const workers = [
      worker({ contractor_id: 'a', pay_rate: 50, hourly_rate: 99, hours_allocated: 2 }), // 100
      worker({ contractor_id: 'b', pay_rate: null, hourly_rate: 30, hours_allocated: 3 }), // 90
    ]
    const summary = calculateLabour(500, 5, workers)
    expect(summary.workers[0].totalCost).toBe(100)
    expect(summary.workers[1].totalCost).toBe(90)
    expect(summary.totalLabourCost).toBe(190)
  })
})
