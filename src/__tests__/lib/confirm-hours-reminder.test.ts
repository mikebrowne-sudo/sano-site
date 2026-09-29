/**
 * The evening "confirm your hours" reminder + Carol's queue signal.
 *
 * Source-level assertions on the wiring that a pure-function test can't reach:
 * which table the cron iterates, how it dedupes, and that the contractor can
 * never move money.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const cron = read('src/app/api/cron/daily-notifications/route.ts')
const action = read('src/app/contractor/jobs/[id]/_actions-confirm-hours.ts')
const approvals = read('src/lib/contractor-pay-approvals-data.ts')
const types = read('src/lib/notifications/types.ts')
const settings = read('src/lib/notifications/settings.ts')

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('confirm-hours reminder cron', () => {
  // Assignment lives in job_workers — on a two-cleaner job BOTH cleaners must
  // be asked, each about their own share. Iterating jobs.contractor_id (the
  // primary pointer) would silently skip the second cleaner.
  it('iterates job_workers, not jobs.contractor_id', () => {
    expect(cron).toMatch(/from\('job_workers'\)/)
    expect(cron).toMatch(/hours_confirmed_status', 'unconfirmed'/)
  })

  it('only asks about finished jobs', () => {
    expect(cron).toMatch(/\['completed', 'invoiced'\]/)
  })

  it('never asks about a job scheduled in the future', () => {
    expect(cron).toMatch(/\.lte\('jobs\.scheduled_date', today\)/)
  })

  it('skips soft-deleted jobs', () => {
    expect(cron).toMatch(/\.is\('jobs\.deleted_at', null\)/)
  })

  // Per-WORKER dedupe, not per-job: two cleaners on one job each get their own
  // reminder, and neither blocks the other.
  it('dedupes per worker per day', () => {
    expect(cron).toMatch(/related_contractor_id', row\.contractor_id/)
    expect(cron).toMatch(/\.gte\('created_at', todayStartIso\)/)
  })

  it('shows the contractor their own share via the shared helper', () => {
    expect(cron).toMatch(/hoursToConfirm\(/)
  })

  it('failures in this task do not break the other cron tasks', () => {
    expect(cron).toMatch(/confirm_hours: \$\{\(e as Error\)\.message\}/)
  })
})

describe('notification type registration', () => {
  it('registers confirm_hours as a contractor type', () => {
    expect(types).toMatch(/'confirm_hours'/)
    expect(types).toMatch(/type: 'confirm_hours',\s+audience: 'contractor'/)
  })

  it('is enabled by default', () => {
    expect(settings).toMatch(/'contractor\.confirm_hours':\s+true/)
  })
})

describe('contractor confirm action — cannot move money', () => {
  it('records an overrun as PENDING, so an admin still signs it off', () => {
    expect(action).toMatch(/extra_hours_status: 'pending'/)
  })

  it('clears any prior approval when a new figure is submitted', () => {
    expect(action).toMatch(/extra_hours_approved_at: null/)
    expect(action).toMatch(/extra_hours_approved_by: null/)
  })

  it('never writes pay_status, pay_rate or hours_allocated', () => {
    const code = codeOnly(action)
    expect(code).not.toMatch(/pay_status:/)
    expect(code).not.toMatch(/pay_rate:/)
    expect(code).not.toMatch(/hours_allocated:/)
  })

  it('verifies assignment through job_workers, so a 2nd cleaner can confirm', () => {
    expect(action).toMatch(/from\('job_workers'\)/)
    expect(action).toMatch(/\.eq\('contractor_id', contractorId\)/)
  })

  it('refuses to confirm a job that is not finished', () => {
    expect(action).toMatch(/isConfirmable/)
  })

  it('requires hours AND a reason for an overrun', () => {
    expect(action).toMatch(/Enter how many extra hours/)
    expect(action).toMatch(/why it took longer/)
  })

  it('audits the answer', () => {
    expect(action).toMatch(/job_worker\.hours_confirmed/)
  })
})

describe("Carol's approval queue", () => {
  it('carries the contractor confirmation onto each row', () => {
    expect(approvals).toMatch(/confirmation: queueSignal\(/)
    expect(approvals).toMatch(/hours_confirmed_status, hours_confirmed_note/)
  })

  it('stays read-only — approving is a separate, explicit action', () => {
    const code = codeOnly(approvals)
    expect(code).not.toMatch(/\.update\(/)
    expect(code).not.toMatch(/\.insert\(/)
  })
})
