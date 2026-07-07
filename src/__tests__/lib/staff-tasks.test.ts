import { buildStaffTasks, allTasksDone, type StaffTaskCounts } from '@/lib/staff-tasks'

const zero: StaffTaskCounts = {
  payApprovals: 0,
  unassignedJobs: 0,
  invoicesOverdue: 0,
  invoicesToSend: 0,
}

describe('buildStaffTasks', () => {
  it('marks a task done exactly when its count is zero', () => {
    const tasks = buildStaffTasks({ ...zero, payApprovals: 3 })
    const pay = tasks.find((t) => t.key === 'payApprovals')!
    expect(pay.count).toBe(3)
    expect(pay.done).toBe(false)
    // everything else is zero → done
    expect(tasks.filter((t) => t.key !== 'payApprovals').every((t) => t.done)).toBe(true)
  })

  it('every task has a deep-link and a helper', () => {
    const tasks = buildStaffTasks(zero)
    expect(tasks.length).toBeGreaterThan(0)
    for (const t of tasks) {
      expect(t.href).toMatch(/^\/portal\//)
      expect(t.helper.length).toBeGreaterThan(10)
    }
  })

  it('is ops-focused and excludes remittance tasks (Michael handles those)', () => {
    const keys = buildStaffTasks(zero).map((t) => t.key)
    expect(keys).toEqual([
      'payApprovals',
      'unassignedJobs',
      'invoicesOverdue',
      'invoicesToSend',
    ])
    expect(keys).not.toContain('remittancesToSend')
    expect(keys).not.toContain('remittancesToPay')
  })

  it('allTasksDone is true only when nothing is outstanding', () => {
    expect(allTasksDone(buildStaffTasks(zero))).toBe(true)
    expect(allTasksDone(buildStaffTasks({ ...zero, invoicesOverdue: 1 }))).toBe(false)
  })
})
