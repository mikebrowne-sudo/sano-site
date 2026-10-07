// Lifecycle + security invariants for the effective-dated contractor GST history
// (PR 5). Source-level assertions locking the guarantees (coexist, no self-verify,
// atomic supersede, token safety, cache sync, migration constraints).

import { readFileSync } from 'fs'
import { join } from 'path'

const staffAction = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/gst/_actions.ts'), 'utf8')
const contractorAction = readFileSync(join(process.cwd(), 'src/app/contractor-setup/[token]/_gst-actions.ts'), 'utf8')
const dataLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history-data.ts'), 'utf8')
const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-01-contractor-gst-history.sql'), 'utf8')

describe('verified + pending replacement coexist; contractor cannot self-verify', () => {
  it('contractor submission is always pending, source contractor_submitted, never verified', () => {
    expect(contractorAction).toMatch(/status:\s*'submitted'/)
    expect(contractorAction).toMatch(/source:\s*'contractor_submitted'/)
    expect(contractorAction).not.toMatch(/status:\s*'verified'/)
    expect(contractorAction).not.toContain('verified_at:')
  })
  it('submit clears only a prior SUBMITTED row, never the verified one', () => {
    expect(contractorAction).toMatch(/priorSubmitted[\s\S]*?\.eq\('status',\s*'submitted'\)/)
    expect(staffAction).toMatch(/priorSubmitted[\s\S]*?\.eq\('status',\s*'submitted'\)/)
  })
})

describe('verify supersedes the prior verified atomically + syncs the cache', () => {
  it('verify supersedes the prior current-verified row (both pointers)', () => {
    expect(staffAction).toMatch(/priorVerified[\s\S]*?\.eq\('status',\s*'verified'\)[\s\S]*?\.is\('superseded_at',\s*null\)/)
    expect(staffAction).toMatch(/status:\s*'superseded'[\s\S]*superseded_by_id:\s*gstId/)
  })
  it('reject leaves the verified status untouched', () => {
    expect(staffAction).toMatch(/if\s*\(status === 'rejected'\)/)
    expect(staffAction).toMatch(/status:\s*'rejected'/)
  })
  it('verify + verify-now sync the derived contractors.gst_* cache (date-resolved)', () => {
    expect(staffAction).toMatch(/syncGstCache/)
    expect(dataLib).toMatch(/export async function syncGstCache/)
    // the cache reflects the status APPLICABLE TODAY (date-resolved), not newest.
    const sync = dataLib.slice(dataLib.indexOf('export async function syncGstCache'), dataLib.indexOf('export async function refreshGstCacheIfStale'))
    expect(sync).toMatch(/selectGstStatusForDate/)
  })
  it('completeness guard on verify (effective date for every verified status, signature, wording)', () => {
    expect(staffAction).toMatch(/Set an effective date before verifying this GST status/)
    expect(staffAction).toMatch(/must be signed/)
  })
})

describe('token route exposes only contractor-safe GST fields', () => {
  it('the safe select excludes review notes / verification metadata / evidence', () => {
    const start = dataLib.indexOf('getContractorSafeGstByToken')
    const region = dataLib.slice(start)
    const cols = region.match(/\.select\('([^']*)'\)/)?.[1] ?? ''
    for (const f of ['review_notes', 'verified_at', 'verified_by', 'evidence_ref', 'created_by', 'supersedes_id']) {
      expect(cols.includes(f)).toBe(false)
    }
    const iface = dataLib.slice(dataLib.indexOf('export interface ContractorSafeGst'), dataLib.indexOf('}', dataLib.indexOf('export interface ContractorSafeGst')))
    for (const f of ['reviewNotes', 'verifiedAt', 'evidenceRef']) expect(iface.includes(f)).toBe(false)
  })
  it('token read is length-guarded + status-gated', () => {
    expect(dataLib).toMatch(/token\.length < 16/)
    expect(dataLib).toMatch(/OPEN\.has/)
  })
})

describe('no turnover inference; never applied before effective date', () => {
  it('nothing in the GST code computes registration from a turnover threshold', () => {
    // "turnover" appears only in comments stating we do NOT infer from it; the
    // real guarantee is: no $60k threshold arithmetic anywhere.
    for (const src of [staffAction, contractorAction, dataLib]) {
      expect(src).not.toMatch(/60[,_ ]?000/)
      expect(src).not.toMatch(/turnover\s*[><=]/i) // no turnover comparison
    }
  })
  it('the GST window resolver is unresolved-aware (never silently not-registered)', () => {
    const gstLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history.ts'), 'utf8')
    expect(gstLib).toMatch(/effectiveDate > dateIso/) // future-effective not in force
    expect(gstLib).toMatch(/resolution:\s*'unresolved'/) // tri-state, not silent no-GST
  })
})

describe('source of truth = history; existing invoices untouched', () => {
  it('the GST feature never reads or writes contractor_invoices / gst_applied / remittances', () => {
    for (const src of [staffAction, contractorAction, dataLib]) {
      expect(src).not.toContain('contractor_invoices')
      expect(src).not.toContain('gst_applied')
      expect(src).not.toContain('contractor_remittance')
    }
  })
  it('historical resolution uses the history list; the cache write is date-resolved from verified rows', () => {
    // syncGstCache reads verified history rows + date-resolves before writing the
    // contractors.gst_* cache.
    const sync = dataLib.slice(dataLib.indexOf('export async function syncGstCache'), dataLib.indexOf('export async function refreshGstCacheIfStale'))
    expect(sync).toMatch(/from\('contractor_gst_history'\)/)
    expect(sync).toMatch(/selectGstStatusForDate/)
    expect(sync).toMatch(/from\('contractors'\)\.update/)
    // date resolution keys off the history records, not the flat contractors columns.
    const gstLib = readFileSync(join(process.cwd(), 'src/lib/contractor-gst-history.ts'), 'utf8')
    expect(gstLib).toMatch(/selectGstStatusForDate/)
    expect(gstLib).not.toContain('contractors')
  })
})

describe('migration: immutable, split indexes, consistency constraints', () => {
  it('has the immutability trigger', () => {
    expect(sql).toMatch(/cgh_immutable_facts/)
    expect(sql).toMatch(/submitted GST facts are immutable/)
  })
  it('has separate one-submitted + one-current-verified partial indexes', () => {
    expect(sql).toMatch(/cgh_one_submitted_per_contractor[\s\S]*where status = 'submitted'/)
    expect(sql).toMatch(/cgh_one_current_verified_per_contractor[\s\S]*where status = 'verified' and superseded_at is null/)
  })
  it('has consistency + verified-completeness constraints', () => {
    for (const c of ['cgh_registered_number_chk', 'cgh_end_after_effective_chk', 'cgh_verified_complete_chk']) {
      expect(sql).toContain(c)
    }
  })
  it('registered-number CHECK requires a GST number when registered', () => {
    expect(sql).toMatch(/gst_registered = false or \(gst_number is not null/)
  })

  it('EVERY verified row requires an effective date (no registered-only exception)', () => {
    // The completeness CHECK must require effective_date unconditionally for
    // verified rows — the old "(gst_registered = false or effective_date...)"
    // exception is gone.
    expect(sql).not.toMatch(/gst_registered = false or effective_date is not null/)
    const chk = sql.slice(sql.indexOf('cgh_verified_complete_chk'))
    expect(chk).toMatch(/effective_date is not null/)
  })

  it('the app verify guards require an effective date for every verified status', () => {
    expect(staffAction).toMatch(/A verified GST status needs an effective date/)
    expect(staffAction).toMatch(/Set an effective date before verifying this GST status/)
    // no registered-only carve-out left in the guards.
    expect(staffAction).not.toMatch(/verified registered status needs an effective date/)
  })
  it('the backfill is commented out (opt-in)', () => {
    expect(sql).toMatch(/-- insert into public\.contractor_gst_history/)
  })

  it('the backfill imports as SUBMITTED (pending), never verified — cannot violate the completeness CHECK', () => {
    // The commented backfill's status must be 'submitted', and it must not set
    // verified_at / a signature, so it can never create an invalid verified row.
    const backfill = sql.slice(sql.indexOf('OPTIONAL backfill'))
    expect(backfill).toMatch(/'staff_recorded',\s*'submitted'/)
    expect(backfill).not.toMatch(/'staff_recorded',\s*'verified'/)
    expect(backfill).not.toMatch(/verified_at/)
    expect(backfill).not.toMatch(/signed_name|signed_at/)
  })

  it('the backfill states imported legacy data is NOT a verified contractor declaration', () => {
    expect(sql).toMatch(/NOT (a )?verified contractor declaration|NOT equivalent to a verified contractor declaration/i)
    expect(sql).toMatch(/staff review required|staff verification/i)
  })
})

describe('derived cache is date-resolved (applicable today), with a refresh mechanism', () => {
  it('syncGstCache resolves the status applicable on a date, not the newest verified row', () => {
    const sync = dataLib.slice(dataLib.indexOf('export async function syncGstCache'), dataLib.indexOf('export async function refreshGstCacheIfStale'))
    expect(sync).toMatch(/selectGstStatusForDate/)
    expect(sync).toMatch(/asOf/)
    // it must NOT just take the single current verified row.
    expect(sync).not.toMatch(/\.eq\('status',\s*'verified'\)\s*[\s\S]{0,40}\.maybeSingle\(\)/)
  })
  it('a refresh-on-read mechanism exists (so a future-effective row arrives on its effective date)', () => {
    expect(dataLib).toMatch(/export async function refreshGstCacheIfStale/)
    const gstPage = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/gst/page.tsx'), 'utf8')
    expect(gstPage).toMatch(/refreshGstCacheIfStale/)
  })
})
